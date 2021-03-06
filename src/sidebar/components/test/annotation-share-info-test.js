const { createElement } = require('preact');
const { mount } = require('enzyme');

const fixtures = require('../../test/annotation-fixtures');

const AnnotationShareInfo = require('../annotation-share-info');
const { $imports } = require('../annotation-share-info');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationShareInfo', () => {
  let fakeGroup;
  let fakeStore;
  let fakeGetGroup;
  let fakePermissions;

  const createAnnotationShareInfo = props => {
    return mount(
      <AnnotationShareInfo
        annotation={fixtures.defaultAnnotation()}
        permissions={fakePermissions}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeGroup = {
      name: 'My Group',
      links: {
        html: 'https://www.example.com',
      },
      type: 'private',
    };
    fakeGetGroup = sinon.stub().returns(fakeGroup);
    fakeStore = { getGroup: fakeGetGroup };
    fakePermissions = {
      isShared: sinon.stub().returns(true),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('group link', () => {
    it('should show a link to the group for extant, first-party groups', () => {
      const wrapper = createAnnotationShareInfo();

      const groupLink = wrapper.find('.annotation-share-info__group');
      const groupName = wrapper.find('.annotation-share-info__group-info');

      assert.equal(groupLink.prop('href'), fakeGroup.links.html);
      assert.equal(groupName.text(), fakeGroup.name);
    });

    it('should display a group icon for private and restricted groups', () => {
      const wrapper = createAnnotationShareInfo();

      const groupIcon = wrapper.find(
        '.annotation-share-info__group .annotation-share-info__icon'
      );

      assert.equal(groupIcon.prop('name'), 'groups');
    });

    it('should display a public/world icon for open groups', () => {
      fakeGroup.type = 'open';
      const wrapper = createAnnotationShareInfo();

      const groupIcon = wrapper.find(
        '.annotation-share-info__group .annotation-share-info__icon'
      );

      assert.equal(groupIcon.prop('name'), 'public');
    });

    it('should not show a link to third-party groups', () => {
      // Third-party groups have no `html` link
      fakeGetGroup.returns({ name: 'A Group', links: {} });

      const wrapper = createAnnotationShareInfo();
      const groupLink = wrapper.find('.annotation-share-info__group');

      assert.notOk(groupLink.exists());
    });

    it('should not show a link if no group available', () => {
      fakeGetGroup.returns(undefined);

      const wrapper = createAnnotationShareInfo();
      const groupLink = wrapper.find('.annotation-share-info__group');

      assert.notOk(groupLink.exists());
    });
  });

  describe('"only you" information', () => {
    it('should not show privacy information if annotation is not private', () => {
      const wrapper = createAnnotationShareInfo();

      const privacy = wrapper.find('.annotation-share-info__private');

      assert.notOk(privacy.exists());
    });
    context('private annotation', () => {
      beforeEach(() => {
        fakePermissions.isShared.returns(false);
      });

      it('should show privacy icon', () => {
        const wrapper = createAnnotationShareInfo();

        const privacyIcon = wrapper.find(
          '.annotation-share-info__private .annotation-share-info__icon'
        );

        assert.isOk(privacyIcon.exists());
        assert.equal(privacyIcon.prop('name'), 'lock');
      });
      it('should not show "only me" text for first-party group', () => {
        const wrapper = createAnnotationShareInfo();

        const privacyText = wrapper.find(
          '.annotation-share-info__private-info'
        );

        assert.notOk(privacyText.exists());
      });
      it('should show "only me" text for annotation in third-party group', () => {
        fakeGetGroup.returns({ name: 'Some Name' });
        const wrapper = createAnnotationShareInfo();

        const privacyText = wrapper.find(
          '.annotation-share-info__private-info'
        );

        assert.isOk(privacyText.exists());
        assert.equal(privacyText.text(), 'Only me');
      });
    });
  });
});
