const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useMemo } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');
const useStore = require('../store/use-store');

const Button = require('./button');

/**
 * Of the annotations in the thread `annThread`, how many
 * are currently `visible` in the browser (sidebar)?
 */
const countVisibleAnns = annThread => {
  return annThread.children.reduce(
    function(count, child) {
      return count + countVisibleAnns(child);
    },
    annThread.visible ? 1 : 0
  );
};

/**
 * UI for displaying information about the currently-applied filtering of
 * annotations, and, in some cases, a mechanism for clearing the filter(s).
 * */
function SearchStatusBar({ rootThread }) {
  const thread = useStore(store => rootThread.thread(store.getState()));

  const actions = useStore(store => ({
    clearSelection: store.clearSelection,
  }));

  const counts = useStore(store => ({
    annotations: store.annotationCount(),
    notes: store.noteCount(),
  }));

  const {
    directLinkedGroupFetchFailed,
    filterQuery,
    focusModeFocused,
    focusModeUserPrettyName,
    selectionMap,
    selectedTab,
  } = useStore(store => ({
    directLinkedGroupFetchFailed: store.getState().directLinked
      .directLinkedGroupFetchFailed,
    filterQuery: store.getState().selection.filterQuery,
    focusModeFocused: store.focusModeFocused(),
    focusModeUserPrettyName: store.focusModeUserPrettyName(),
    selectionMap: store.getState().selection.selectedAnnotationMap,
    selectedTab: store.getState().selection.selectedTab,
  }));

  // The search status bar UI represents multiple "modes" of filtering
  const modes = {
    /**
     * @type {Boolean}
     * A search (filter) query, visible to the user in the search bar, is
     * currently applied
     */
    filtered: !!filterQuery,
    /**
     * @type {Boolean}
     * The client has a currently-applied focus on a single user. Superseded by
     * `filtered` mode.
     */
    focused: focusModeFocused && !filterQuery,
    /**
     * @type {Boolean}
     * 0 - n annotations are currently "selected", by, e.g. clicking on highlighted
     * text in the host page, direct-linking to an annotation, etc. Superseded by
     * `filtered` mode.
     */
    selected: (() => {
      if (directLinkedGroupFetchFailed) {
        return true;
      }
      return (
        !!selectionMap && Object.keys(selectionMap).length > 0 && !filterQuery
      );
    })(),
  };

  const visibleCount = useMemo(() => {
    return countVisibleAnns(thread);
  }, [thread]);

  // Each "mode" has corresponding descriptive text about the number of
  // matching/applicable annotations and, sometimes, a way to clear the
  // filter
  const modeText = {
    filtered: (() => {
      switch (visibleCount) {
        case 0:
          return `No results for "${filterQuery}"`;
        case 1:
          return '1 search result';
        default:
          return `${visibleCount} search results`;
      }
    })(),
    focused: (() => {
      switch (visibleCount) {
        case 0:
          return `No annotations for ${focusModeUserPrettyName}`;
        case 1:
          return 'Showing 1 annotation';
        default:
          return `Showing ${visibleCount} annotations`;
      }
    })(),
    selected: (() => {
      // Generate the proper text to show on the clear-selection button.
      // For non-user-focused modes, we can display the number of annotations
      // that will be visible if the selection is cleared (`counts.annotations`)
      // but this number is inaccurate/misleading when also focused on a user.
      let selectedText;
      switch (selectedTab) {
        case uiConstants.TAB_ORPHANS:
          selectedText = 'Show all annotations and notes';
          break;
        case uiConstants.TAB_NOTES:
          selectedText = 'Show all notes';
          if (counts.notes > 1 && !modes.focused) {
            selectedText += ` (${counts.notes})`;
          } else if (modes.focused) {
            selectedText += ` by ${focusModeUserPrettyName}`;
          }
          break;
        case uiConstants.TAB_ANNOTATIONS:
          selectedText = 'Show all annotations';
          if (counts.annotations > 1 && !modes.focused) {
            selectedText += ` (${counts.annotations})`;
          } else if (modes.focused) {
            selectedText = `Show all annotations by ${focusModeUserPrettyName}`;
          }
          break;
      }
      return selectedText;
    })(),
  };

  return (
    <div>
      {modes.filtered && (
        <div className="search-status-bar">
          <Button
            icon="cancel"
            buttonText="Clear search"
            onClick={actions.clearSelection}
            useCompactStyle
            usePrimaryStyle
          />
          <span className="search-status-bar__filtered-text">
            {modeText.filtered}
          </span>
        </div>
      )}
      {modes.focused && (
        <div className="search-status-bar">
          <span className="search-status-bar__focused-text">
            <strong>{modeText.focused}</strong>
          </span>
        </div>
      )}
      {modes.selected && (
        <div className="search-status-bar">
          <Button
            buttonText={modeText.selected}
            onClick={actions.clearSelection}
            useCompactStyle
            usePrimaryStyle
          />
        </div>
      )}
    </div>
  );
}

SearchStatusBar.propTypes = {
  // Injected services.
  rootThread: propTypes.object.isRequired,
};

SearchStatusBar.injectedProps = ['rootThread'];

module.exports = withServices(SearchStatusBar);
