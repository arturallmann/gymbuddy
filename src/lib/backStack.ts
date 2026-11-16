// What Android Back does (4b.2, decision 034). Parts of the interface register a handler while
// they are shown. Back runs the newest "close" handler first: it closes what is open on the page,
// such as a confirm step or a set being edited. Without one, Back runs the newest "page" handler,
// which goes to the page before (the page's back arrow registers it). Without either, the app
// closes; that happens on the home page.

export type BackKind = 'close' | 'page';
type Entry = { kind: BackKind; run: () => void };

export type BackStack = {
  // Adds a handler and returns a function that removes it again.
  register: (kind: BackKind, run: () => void) => () => void;
  // Runs the handler that applies, and returns false when there is none.
  back: () => boolean;
};

export function createBackStack(): BackStack {
  const entries: Entry[] = [];
  return {
    register(kind, run) {
      const entry = { kind, run };
      entries.push(entry);
      return () => {
        const index = entries.indexOf(entry);
        if (index >= 0) entries.splice(index, 1);
      };
    },
    back() {
      const entry = entries.findLast((candidate) => candidate.kind === 'close') ?? entries.findLast((candidate) => candidate.kind === 'page');
      entry?.run();
      return entry !== undefined;
    },
  };
}

// The one back stack of the app.
export const backStack = createBackStack();
