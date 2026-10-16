import { activeEvents, EVENTS_KEY, loadEvents, localDate, nextLocalMidnight, saveEvents, validateEvent, type PlannedEvent } from './events';

export function setupEvents(onChange: () => void): () => PlannedEvent[] {
  const form = document.querySelector<HTMLFormElement>('#event-form')!;
  const name = document.querySelector<HTMLInputElement>('#event-name')!;
  const shards = document.querySelector<HTMLInputElement>('#event-shards')!;
  const end = document.querySelector<HTMLInputElement>('#event-end')!;
  const list = document.getElementById('events-list')!;
  const cancel = document.getElementById('event-cancel')!;
  const submit = document.getElementById('event-submit')!;
  const storageMessage = document.getElementById('events-storage')!;
  let { events, saved } = loadEvents();
  let editing: string | null = null;
  let timer: ReturnType<typeof setTimeout>;

  function clearEditor() {
    editing = null;
    form.reset();
    cancel.hidden = true;
    submit.textContent = 'Add event';
    document.getElementById('event-editor-heading')!.textContent = 'Add an event';
    for (const field of [name, shards, end]) {
      field.removeAttribute('aria-invalid');
      document.getElementById(`${field.id}-error`)!.hidden = true;
    }
  }

  function persist() {
    saved = saveEvents(events);
  }

  function render() {
    storageMessage.hidden = saved;
    end.min = localDate();
    list.replaceChildren();
    document.getElementById('events-empty')!.hidden = events.length > 0;
    for (const event of events) {
      const row = document.createElement('li');
      const details = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = event.name;
      const description = document.createElement('p');
      description.textContent = `${event.remainingShards.toLocaleString('en-US')} Racer Shards still obtainable · Ends ${event.endDate}`;
      details.append(title, description);
      const actions = document.createElement('div');
      actions.className = 'event-actions';
      for (const action of ['Edit', 'Remove']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action;
        button.setAttribute('aria-label', `${action} ${event.name}`);
        button.addEventListener('click', () => {
          if (action === 'Edit') {
            clearEditor();
            editing = event.id;
            name.value = event.name;
            shards.value = String(event.remainingShards);
            end.value = event.endDate;
            cancel.hidden = false;
            submit.textContent = 'Save event';
            document.getElementById('event-editor-heading')!.textContent = 'Edit event';
            name.focus();
          } else {
            events = events.filter(item => item.id !== event.id);
            if (editing === event.id) clearEditor();
            persist();
            refresh();
            name.focus();
            document.getElementById('event-announcement')!.textContent = `${event.name} removed.`;
          }
        });
        actions.append(button);
      }
      row.append(details, actions);
      list.append(row);
    }
  }

  function refresh() {
    const active = activeEvents(events);
    if (active.length !== events.length) {
      events = active;
      persist();
      document.getElementById('event-announcement')!.textContent = 'Expired events removed. Planned rewards updated.';
    }
    if (editing && !events.some(event => event.id === editing)) clearEditor();
    render();
    clearTimeout(timer);
    timer = setTimeout(refresh, nextLocalMidnight().getTime() - Date.now());
    onChange();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const checked = validateEvent(name.value, shards.value, end.value);
    const fields = [[name, checked.errors.name], [shards, checked.errors.remainingShards], [end, checked.errors.endDate]] as const;
    for (const [field, error] of fields) {
      field.setAttribute('aria-invalid', String(Boolean(error)));
      const message = document.getElementById(`${field.id}-error`)!;
      message.textContent = error;
      message.hidden = !error;
    }
    if (!checked.value) {
      fields.find(([, error]) => error)![0].focus();
      return;
    }
    const value: PlannedEvent = { id: editing ?? crypto.randomUUID(), ...checked.value };
    events = editing ? events.map(item => item.id === editing ? value : item) : [...events, value];
    persist();
    clearEditor();
    refresh();
    name.focus();
    document.getElementById('event-announcement')!.textContent = `${value.name} added or updated in this tab.`;
  });
  cancel.addEventListener('click', () => { clearEditor(); name.focus(); });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('storage', event => {
    if (event.key !== EVENTS_KEY && event.key !== null) return;
    const loaded = loadEvents();
    if (loaded.readable) events = loaded.events;
    saved = loaded.saved;
    refresh();
  });
  render();
  timer = setTimeout(refresh, nextLocalMidnight().getTime() - Date.now());
  return () => activeEvents(events);
}
