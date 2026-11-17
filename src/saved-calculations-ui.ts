import { CALCULATIONS_KEY, readCalculations, writeCalculation, type SavedCalculation, type SavedInputs } from './saved-calculations';

interface WorkingCalculation {
  capture: () => unknown;
  inputs: () => SavedInputs | null;
  apply: (value: SavedInputs) => void;
  reset: () => void;
  hasEventEdit: () => boolean;
}
export interface SavedContext { activeId: string | null; name: string; dirty: boolean; isolatedEvents?: boolean }

export function setupSavedCalculations(working: WorkingCalculation) {
  const name = document.querySelector<HTMLInputElement>('#calculation-name')!;
  const status = document.getElementById('calculation-status')!;
  const error = document.getElementById('calculation-error')!;
  const list = document.getElementById('calculations-list')!;
  const saveButton = document.getElementById('calculation-save')!;
  const copyButton = document.getElementById('calculation-copy')!;
  const dialog = document.querySelector<HTMLDialogElement>('#calculation-guard')!;
  const deleteDialog = document.querySelector<HTMLDialogElement>('#calculation-delete-dialog')!;
  let activeId: string | null = null;
  let missing = false;
  let isolatedEvents = false;
  let baseline = fingerprint();
  let restoredDirty = false;
  let pending: (() => void) | null = null;
  let deleting: string | null = null;

  function fingerprint() { return JSON.stringify({ name: name.value, values: working.capture() }); }
  function dirty() { return missing || restoredDirty || fingerprint() !== baseline; }
  function showError(message: string) {
    error.textContent = message;
    error.hidden = !message;
  }
  function changed() {
    status.textContent = dirty() ? 'Unsaved changes' : activeId ? 'Saved in this browser' : 'New calculation';
    saveButton.textContent = activeId ? 'Save changes' : 'Save calculation';
    saveButton.hidden = missing;
    copyButton.hidden = activeId === null;
  }
  function clean() { baseline = fingerprint(); restoredDirty = false; changed(); }

  function refresh() {
    const loaded = readCalculations();
    showError(loaded.error);
    if (!loaded.error && activeId) {
      missing = !loaded.records.some(record => record.id === activeId);
      if (missing) showError('This calculation was deleted in another tab. Use Save as new to keep your changes.');
    }
    list.replaceChildren();
    document.getElementById('calculations-empty')!.hidden = loaded.records.length > 0 || Boolean(loaded.error);
    for (const record of loaded.records) {
      const row = document.createElement('li');
      const details = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = record.name;
      const progress = document.createElement('p');
      progress.textContent = `Current: ${record.currentStars} Stars + ${record.completedSteps}/5 Star Fragments · Target: ${record.targetStars} Stars + ${record.targetSteps}/5 Star Fragments`;
      const time = document.createElement('time');
      time.dateTime = record.updatedAt;
      time.textContent = `Last saved ${new Date(record.updatedAt).toLocaleString('en-US')}`;
      details.append(title, progress, time);
      const actions = document.createElement('div');
      actions.className = 'event-actions';
      for (const action of ['Open', 'Delete']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action;
        button.setAttribute('aria-label', `${action} ${record.name}`);
        button.addEventListener('click', () => {
          if (action === 'Open') guard(() => open(record.id));
          else {
            deleting = record.id;
            document.getElementById('calculation-delete-name')!.textContent = `Delete “${record.name}”? This removes only its saved record.`;
            deleteDialog.showModal();
          }
        });
        actions.append(button);
      }
      row.append(details, actions);
      list.append(row);
    }
    changed();
  }

  function save(asNew = false): boolean {
    if (working.hasEventEdit()) {
      showError('Save or cancel the unfinished event edit before saving this calculation.');
      return false;
    }
    const input = working.inputs();
    if (!input) {
      showError('Correct invalid calculator fields before saving.');
      return false;
    }
    const result = writeCalculation({ type: 'save', id: asNew ? null : activeId, name: name.value, input });
    if (result.error || !result.record) {
      showError(result.error);
      name.setAttribute('aria-invalid', String(!name.value.trim() || name.value.trim().length > 100));
      return false;
    }
    activeId = result.record.id;
    isolatedEvents = true;
    name.value = result.record.name;
    name.removeAttribute('aria-invalid');
    missing = false;
    clean();
    refresh();
    return true;
  }

  function open(id: string) {
    const loaded = readCalculations();
    const record: SavedCalculation | undefined = loaded.records.find(item => item.id === id);
    if (!record) { showError(loaded.error || 'This calculation is no longer available.'); return; }
    activeId = record.id;
    isolatedEvents = true;
    missing = false;
    name.value = record.name;
    working.apply(record);
    clean();
    showError('');
    name.focus();
  }
  function guard(action: () => void) {
    if (!dirty() && !working.hasEventEdit()) { action(); return; }
    pending = action;
    document.getElementById('calculation-guard-save')!.textContent = missing ? 'Save as new' : 'Save';
    dialog.showModal();
  }
  document.getElementById('calculation-guard-save')!.addEventListener('click', () => {
    if (!save(missing)) { dialog.close(); pending = null; return; }
    const action = pending;
    pending = null;
    dialog.close();
    action?.();
  });
  document.getElementById('calculation-guard-discard')!.addEventListener('click', () => {
    const action = pending;
    pending = null;
    dialog.close();
    action?.();
  });
  document.getElementById('calculation-guard-cancel')!.addEventListener('click', () => { pending = null; dialog.close(); });
  dialog.addEventListener('cancel', () => { pending = null; });
  document.getElementById('calculation-delete-confirm')!.addEventListener('click', () => {
    if (!deleting) return;
    const result = writeCalculation({ type: 'delete', id: deleting });
    deleteDialog.close();
    if (result.error) { showError(result.error); return; }
    if (activeId === deleting) { activeId = null; missing = false; restoredDirty = true; }
    deleting = null;
    refresh();
  });
  document.getElementById('calculation-delete-cancel')!.addEventListener('click', () => { deleting = null; deleteDialog.close(); });
  saveButton.addEventListener('click', () => save());
  copyButton.addEventListener('click', () => save(true));
  name.addEventListener('input', changed);
  document.getElementById('calculation-new')!.addEventListener('click', () => guard(() => {
    activeId = null;
    missing = false;
    name.value = '';
    isolatedEvents = true;
    working.reset();
    clean();
    showError('');
    name.focus();
  }));
  window.addEventListener('storage', event => { if (event.key === CALCULATIONS_KEY || event.key === null) refresh(); });
  refresh();
  return {
    changed,
    canSyncEvents: () => !isolatedEvents,
    reset() { if (activeId) restoredDirty = true; changed(); },
    context: (): SavedContext => ({ activeId, name: name.value, dirty: dirty(), isolatedEvents }),
    restore(context: SavedContext) {
      activeId = typeof context.activeId === 'string' ? context.activeId : null;
      isolatedEvents = context.isolatedEvents === true || activeId !== null;
      name.value = typeof context.name === 'string' ? context.name : '';
      clean();
      restoredDirty = context.dirty === true;
      refresh();
    },
  };
}
