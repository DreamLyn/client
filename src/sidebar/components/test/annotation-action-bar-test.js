const { createElement } = require('preact');
const { mount } = require('enzyme');
const { act } = require('preact/test-utils');

const { waitFor } = require('./util');

const AnnotationActionBar = require('../annotation-action-bar');
const { $imports } = require('../annotation-action-bar');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationActionBar', () => {
  let fakeAnnotation;
  let fakeOnEdit;
  let fakeOnReply;

  let fakeUserProfile;

  // Fake services
  let fakeAnnotationMapper;
  let fakeFlash;
  let fakePermissions;
  let fakeSettings;
  // Fake dependencies
  let fakeIsShareable;
  let fakeStore;

  function createComponent(props = {}) {
    return mount(
      <AnnotationActionBar
        annotation={fakeAnnotation}
        annotationMapper={fakeAnnotationMapper}
        flash={fakeFlash}
        onEdit={fakeOnEdit}
        onReply={fakeOnReply}
        permissions={fakePermissions}
        settings={fakeSettings}
        {...props}
      />
    );
  }

  const allowOnly = action => {
    fakePermissions.permits.returns(false);
    fakePermissions.permits
      .withArgs(sinon.match.any, action, sinon.match.any)
      .returns(true);
  };

  const disallowOnly = action => {
    fakePermissions.permits
      .withArgs(sinon.match.any, action, sinon.match.any)
      .returns(false);
  };

  const getButton = (wrapper, iconName) => {
    return wrapper.find('Button').filter({ icon: iconName });
  };

  beforeEach(() => {
    fakeAnnotation = {
      group: 'fakegroup',
      permissions: {},
      user: 'acct:bar@foo.com',
    };

    fakeUserProfile = {
      userid: 'account:foo@bar.com',
    };

    fakeAnnotationMapper = {
      deleteAnnotation: sinon.stub().resolves(),
      flagAnnotation: sinon.stub().resolves(),
    };

    fakeFlash = {
      info: sinon.stub(),
      error: sinon.stub(),
    };

    fakeOnEdit = sinon.stub();
    fakeOnReply = sinon.stub();

    fakePermissions = {
      permits: sinon.stub().returns(true),
    };
    fakeSettings = {};

    fakeIsShareable = sinon.stub().returns(true);

    fakeStore = {
      profile: sinon.stub().returns(fakeUserProfile),
      getGroup: sinon.stub().returns({}),
      updateFlagStatus: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-sharing': {
        isShareable: fakeIsShareable,
        shareURI: sinon.stub().returns('http://share.me'),
      },
      '../store/use-store': callback => callback(fakeStore),
    });
    sinon.stub(window, 'confirm').returns(false);
  });

  afterEach(() => {
    window.confirm.restore();
    $imports.$restore();
  });

  describe('edit action button', () => {
    it('shows edit button if permissions allow', () => {
      allowOnly('update');
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'edit').exists());
    });

    it('invokes `onEdit` callback when edit button clicked', () => {
      allowOnly('update');
      const button = getButton(createComponent(), 'edit');

      button.props().onClick();

      assert.calledOnce(fakeOnEdit);
    });

    it('does not show edit button if permissions do not allow', () => {
      disallowOnly('update');

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'edit').exists());
    });
  });

  describe('delete action button', () => {
    it('shows delete button if permissions allow', () => {
      allowOnly('delete');
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'trash').exists());
    });

    it('asks for confirmation before deletion', () => {
      allowOnly('delete');
      const button = getButton(createComponent(), 'trash');

      act(() => {
        button.props().onClick();
      });

      assert.calledOnce(confirm);
      assert.notCalled(fakeAnnotationMapper.deleteAnnotation);
    });

    it('invokes delete on service when confirmed', () => {
      allowOnly('delete');
      window.confirm.returns(true);
      const button = getButton(createComponent(), 'trash');

      act(() => {
        button.props().onClick();
      });

      assert.calledWith(fakeAnnotationMapper.deleteAnnotation, fakeAnnotation);
    });

    it('sets a flash message if there is an error with deletion', async () => {
      allowOnly('delete');
      window.confirm.returns(true);
      fakeAnnotationMapper.deleteAnnotation.rejects();

      const button = getButton(createComponent(), 'trash');
      act(() => {
        button.props().onClick();
      });

      await waitFor(() => fakeFlash.error.called);
    });
  });

  describe('edit action button', () => {
    it('does not show edit button if permissions do not allow', () => {
      disallowOnly('delete');

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'trash').exists());
    });
  });

  describe('reply action button', () => {
    it('shows the reply button (in all cases)', () => {
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'reply').exists());
    });

    it('invokes `onReply` callback when reply button clicked', () => {
      const button = getButton(createComponent(), 'reply');

      act(() => {
        button.props().onClick();
      });

      assert.calledOnce(fakeOnReply);
    });
  });

  describe('share action button', () => {
    it('shows share action button if annotation is shareable', () => {
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationShareControl').exists());
    });

    it('does not show share action button if annotation is not shareable', () => {
      fakeIsShareable.returns(false);
      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationShareControl').exists());
    });
  });

  describe('flag action button', () => {
    it('shows flag button if user is not author', () => {
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'flag').exists());
    });

    it('sets a flash error when clicked if user is not logged in', () => {
      fakeStore.profile.returns({
        userid: null,
      });

      const button = getButton(createComponent(), 'flag');

      act(() => {
        button.props().onClick();
      });

      assert.calledOnce(fakeFlash.error);
      assert.notCalled(fakeAnnotationMapper.flagAnnotation);
    });

    it('invokes flag on service when clicked', () => {
      window.confirm.returns(true);

      const button = getButton(createComponent(), 'flag');

      act(() => {
        button.props().onClick();
      });

      assert.calledWith(fakeAnnotationMapper.flagAnnotation, fakeAnnotation);
    });

    it('updates flag state in store after flagging on service is successful', async () => {
      window.confirm.returns(true);
      fakeAnnotationMapper.flagAnnotation.resolves(fakeAnnotation);

      const button = getButton(createComponent(), 'flag');

      act(() => {
        button.props().onClick();
      });

      await fakeAnnotation;
      assert.calledWith(fakeStore.updateFlagStatus, fakeAnnotation.id, true);
    });

    it('sets flash error message if flagging fails on service', async () => {
      window.confirm.returns(true);
      fakeAnnotationMapper.flagAnnotation.rejects();

      const button = getButton(createComponent(), 'flag');

      act(() => {
        button.props().onClick();
      });

      await waitFor(() => fakeFlash.error.called);
      assert.notCalled(fakeStore.updateFlagStatus);
    });

    it('does not show flag action button if user is author', () => {
      fakeAnnotation.user = fakeUserProfile.userid;

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'flag').exists());
    });

    context('previously-flagged annotation', () => {
      beforeEach(() => {
        fakeAnnotation.flagged = true;
      });

      it('renders an active-state flag action button', () => {
        const wrapper = createComponent();

        assert.isTrue(getButton(wrapper, 'flag--active').exists());
      });

      it('does not set an `onClick` property for the flag action button', () => {
        const button = getButton(createComponent(), 'flag--active');

        assert.isUndefined(button.props().onClick);
      });
    });
  });
});
