const propTypes = require('prop-types');
const { createElement } = require('preact');
const useStore = require('../store/use-store');
const { copyText } = require('../util/copy-to-clipboard');
const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');

const Button = require('./button');
const ShareLinks = require('./share-links');
const SidebarPanel = require('./sidebar-panel');
const SvgIcon = require('./svg-icon');

/**
 * A panel for sharing the current group's annotations.
 *
 * Links withinin this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 */
function ShareAnnotationsPanel({ analytics, flash }) {
  const mainFrame = useStore(store => store.mainFrame());
  const focusedGroup = useStore(store => store.focusedGroup());

  // We can render a basic frame for the panel at any time,
  // but hold off rendering panel content if needed things aren't present.
  // We need to know what page we're on and what group is focused.
  const shouldRenderPanelContent = focusedGroup && mainFrame;

  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  // Generate bouncer sharing link for annotations in the current group.
  // This is the URI format for the web-sharing link shown in the input
  // and is available to be copied to clipboard
  const shareURI = ((frame, group) => {
    if (!shouldRenderPanelContent) {
      return '';
    }
    return `https://hyp.is/go?url=${encodeURIComponent(mainFrame.uri)}&group=${
      group.id
    }`;
  })(mainFrame, focusedGroup);

  const copyShareLink = () => {
    try {
      copyText(shareURI);
      flash.info('Copied share link to clipboard');
    } catch (err) {
      flash.error('Unable to copy link');
    }
  };

  return (
    <SidebarPanel
      title={panelTitle}
      panelName={uiConstants.PANEL_SHARE_ANNOTATIONS}
    >
      {shouldRenderPanelContent && (
        <div className="share-annotations-panel">
          <div className="share-annotations-panel__intro">
            {focusedGroup.type === 'private' ? (
              <p>
                Use this link to share these annotations with other group
                members:
              </p>
            ) : (
              <p>Use this link to share these annotations with anyone:</p>
            )}
          </div>
          <div className="share-annotations-panel__input">
            <input
              aria-label="Use this URL to share these annotations"
              className="form-input share-annotations-panel__form-input"
              type="text"
              value={shareURI}
              readOnly
            />
            <Button
              icon="copy"
              onClick={copyShareLink}
              title="Copy share link"
              useInputStyle
            />
          </div>
          <p>
            {focusedGroup.type === 'private' ? (
              <span>
                Annotations in the private group <em>{focusedGroup.name}</em>{' '}
                are only visible to group members.
              </span>
            ) : (
              <span>
                Anyone using this link may view the annotations in the group{' '}
                <em>{focusedGroup.name}</em>.
              </span>
            )}{' '}
            <span>
              Private (
              <SvgIcon
                name="lock"
                inline
                className="share-annotations-panel__icon--inline"
              />{' '}
              <em>Only Me</em>) annotations are only visible to you.
            </span>
          </p>
          <ShareLinks
            shareURI={shareURI}
            analyticsEventName={analytics.events.DOCUMENT_SHARED}
          />
        </div>
      )}
    </SidebarPanel>
  );
}

ShareAnnotationsPanel.propTypes = {
  // Injected services
  analytics: propTypes.object.isRequired,
  flash: propTypes.object.isRequired,
};

ShareAnnotationsPanel.injectedProps = ['analytics', 'flash'];

module.exports = withServices(ShareAnnotationsPanel);
