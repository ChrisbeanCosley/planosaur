import { useAppData } from '../context/AppDataContext';
import EventFormModal from './EventFormModal';
import TaskFormModal from './TaskFormModal';

// Opens the edit form for whatever was clicked. selection = { kind: 'task' | 'event', id } or null.
export default function ItemEditor({ selection, onClose }) {
  const { tasks, events, updateTask, deleteTask, updateEvent, deleteEvent } = useAppData();
  if (!selection) return null;

  if (selection.kind === 'task') {
    const task = tasks.find((t) => t.id === selection.id);
    if (!task) return null;
    return (
      <TaskFormModal
        key={task.id}
        task={task}
        onSave={(changes) => updateTask(task.id, changes)}
        onDelete={() => deleteTask(task.id)}
        onClose={onClose}
      />
    );
  }

  const event = events.find((e) => e.id === selection.id);
  if (!event) return null;
  return (
    <EventFormModal
      key={event.id}
      event={event}
      onSave={(changes) => updateEvent(event.id, changes)}
      onDelete={() => deleteEvent(event.id)}
      onClose={onClose}
    />
  );
}

// Turns a calendar entry (event or task) into a selection for ItemEditor.
export const selectionFor = (item) => ({ kind: item.kind === 'task' ? 'task' : 'event', id: item.id });
