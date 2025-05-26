<script lang="ts">
  import { ee } from '~/eventEmitter';
  import { store } from '../store';
  import type { Book } from '~/models';
  import { shortenTitle } from '~/utils';

  // Function to toggle book selection
  function toggleBookSelection(bookId: string) {
    store.update((state) => {
      const selectedBookIds = state.selectedBookIds || [];
      if (selectedBookIds.includes(bookId)) {
        return {
          ...state,
          selectedBookIds: selectedBookIds.filter((id) => id !== bookId),
        };
      } else {
        return {
          ...state,
          selectedBookIds: [...selectedBookIds, bookId],
        };
      }
    });
  }

  // Function to select all books
  function selectAllBooks() {
    store.update((state) => ({
      ...state,
      selectedBookIds: (state.allBooks || []).map((book) => book.id),
    }));
  }

  // Function to deselect all books
  function deselectAllBooks() {
    store.update((state) => ({
      ...state,
      selectedBookIds: [],
    }));
  }

  // Function to confirm selection and start syncing
  function confirmSelection() {
    ee.emit('confirmBookSelection', $store.selectedBookIds || []);
  }

  // Function to check if a book is selected
  function isBookSelected(bookId: string): boolean {
    return ($store.selectedBookIds || []).includes(bookId);
  }
</script>

<div class="kp-book-selection">
  <h3>Select books to synchronize</h3>

  <div class="kp-book-selection-controls">
    <button class="mod-cta" on:click={selectAllBooks}>Select All</button>
    <button class="mod-cta" on:click={deselectAllBooks}>Deselect All</button>
  </div>

  <div class="kp-book-list">
    {#if $store.allBooks && $store.allBooks.length > 0}
      {#each $store.allBooks as book}
        <div class="kp-book-item">
          <label class="kp-book-checkbox">
            <input
              type="checkbox"
              checked={isBookSelected(book.id)}
              on:change={() => toggleBookSelection(book.id)}
            />
            <span class="kp-book-title">{shortenTitle(book.title)}</span>
            {#if book.author}
              <span class="kp-book-author">by {book.author}</span>
            {/if}
          </label>
        </div>
      {/each}
    {:else}
      <div class="kp-no-books">No books found</div>
    {/if}
  </div>

  <div class="kp-book-selection-footer">
    <button
      class="mod-cta"
      on:click={confirmSelection}
      disabled={!$store.selectedBookIds || $store.selectedBookIds.length === 0}
    >
      Sync Selected Books ({$store.selectedBookIds ? $store.selectedBookIds.length : 0})
    </button>
  </div>
</div>

<style>
  .kp-book-selection {
    display: flex;
    flex-direction: column;
    max-height: 400px;
    padding: 10px;
  }

  .kp-book-selection h3 {
    margin-top: 0;
    text-align: center;
  }

  .kp-book-selection-controls {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .kp-book-list {
    overflow-y: auto;
    max-height: 300px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    padding: 5px;
  }

  .kp-book-item {
    padding: 5px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .kp-book-item:last-child {
    border-bottom: none;
  }

  .kp-book-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .kp-book-title {
    margin-left: 8px;
    font-weight: bold;
  }

  .kp-book-author {
    margin-left: 8px;
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .kp-no-books {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
  }

  .kp-book-selection-footer {
    margin-top: 10px;
    display: flex;
    justify-content: center;
  }
</style>
