const { createElement } = require('preact');
const { mount } = require('enzyme');

const mockImportedComponents = require('./mock-imported-components');
const fixtures = require('../../test/annotation-fixtures');

// @TODO Note this import as `Annotation` for easier updating later
const Annotation = require('../annotation-omega');
const { $imports } = require('../annotation-omega');

describe('AnnotationOmega', () => {
  let fakeOnReplyCountClick;

  // Injected service mocks
  let fakePermissions;

  // Dependency Mocks
  let fakeQuote;
  let fakeStore;

  const createComponent = props => {
    return mount(
      <Annotation
        annotation={fixtures.defaultAnnotation()}
        onReplyCountClick={fakeOnReplyCountClick}
        permissions={fakePermissions}
        replyCount={0}
        showDocumentInfo={false}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeOnReplyCountClick = sinon.stub();

    fakeQuote = sinon.stub();
    fakeStore = {
      getDraft: sinon.stub(),
    };

    fakePermissions = {
      default: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': {
        quote: fakeQuote,
      },
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders quote if annotation has a quote', () => {
    fakeQuote.returns('quote');
    const wrapper = createComponent();

    const quote = wrapper.find('AnnotationQuote');
    assert.isTrue(quote.exists());
  });

  it('does not render quote if annotation does not have a quote', () => {
    fakeQuote.returns(null);

    const wrapper = createComponent();

    const quote = wrapper.find('AnnotationQuote');
    assert.isFalse(quote.exists());
  });
});
