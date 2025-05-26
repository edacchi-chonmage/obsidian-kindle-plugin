import AmazonLoginModal from '~/components/amazonLoginModal';
import { ee } from '~/eventEmitter';
import type { Book, KindleFile } from '~/models';
import { scrapeBooks, scrapeHighlightsForBook } from '~/scraper';
import type { SyncManager } from '~/sync';

export default class SyncAmazon {
  constructor(private syncManager: SyncManager) {
    // Listen for the startSyncingSelectedBooks event
    ee.on('startSyncingSelectedBooks', () => {
      void this.syncSelectedBooks();
    });
  }

  public async startSync(): Promise<void> {
    ee.emit('syncSessionStart', 'amazon');

    const success = await this.login();

    if (!success) {
      return; // Do nothing...
    }

    try {
      ee.emit('fetchingBooks');

      const remoteBooks = await scrapeBooks();
      const booksToSync = this.syncManager.filterBooksToSync(remoteBooks);

      // Show book selection view with recommended books pre-selected
      ee.emit('fetchingBooksSuccess', booksToSync, remoteBooks);

      // The actual syncing will be triggered by the confirmBookSelection event
      // which is handled in syncSelectedBooks
    } catch (error) {
      console.error('Error while trying fetch books', error);
      ee.emit('syncSessionFailure', String(error));
    }
  }

  public async syncSelectedBooks(): Promise<void> {
    try {
      // Get the selected books from the store
      const { get } = await import('svelte/store');
      const { store } = await import('~/components/syncModal/store');
      const state = get(store);

      if (!state.allBooks || !state.selectedBookIds || state.selectedBookIds.length === 0) {
        console.error('No books selected to sync');
        return;
      }

      const booksToSync = state.allBooks.filter(book =>
        state.selectedBookIds.includes(book.id)
      );

      if (booksToSync.length > 0) {
        await this.syncBooks(booksToSync);
      }

      ee.emit('syncSessionSuccess');
    } catch (error) {
      console.error('Error while trying to sync selected books', error);
      ee.emit('syncSessionFailure', String(error));
    }
  }

  public async resync(file: KindleFile): Promise<void> {
    ee.emit('resyncBook', file);

    const success = await this.login();

    if (!success) {
      return; // Do nothing...
    }

    try {
      const remoteBooks = await scrapeBooks();
      const remoteBook = remoteBooks.find((r) => r.id === file.book.id);

      const highlights = await scrapeHighlightsForBook(file.book);

      const diffs = await this.syncManager.resyncBook(file, remoteBook, highlights);

      ee.emit('resyncComplete', file, diffs.length);
    } catch (error) {
      console.error('Error resyncing higlights for file', file, error);
      ee.emit('resyncFailure', file, String(error));
    }
  }

  private async login(): Promise<boolean> {
    ee.emit('startLogin');

    const modal = new AmazonLoginModal();
    const success = await modal.doLogin();

    ee.emit('loginComplete', success);

    return success;
  }

  private async syncBooks(books: Book[]): Promise<void> {
    for (const [index, book] of books.entries()) {
      try {
        ee.emit('syncBook', book, index);

        const highlights = await scrapeHighlightsForBook(book);
        await this.syncManager.syncBook(book, highlights);

        ee.emit('syncBookSuccess', book, highlights);
      } catch (error) {
        console.error('Error syncing book', book, error);
        ee.emit('syncBookFailure', book, String(error));
      }
    }
  }
}
