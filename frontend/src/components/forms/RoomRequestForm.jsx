import { useEffect, useState } from 'react';
import FormField from '../FormField.jsx';
import FormActions from './FormActions.jsx';
import { useFormState } from './useFormState.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { publicService } from '../../services/publicService.js';
import { useAccountPrefill } from './useAccountPrefill.js';

const AVAILABILITY_REFRESH_MILLISECONDS = 15000;
const REQUIRED_FIELDS = ['requester_lastname', 'requester_firstname', 'email', 'phone', 'room_id', 'requested_date', 'start_time', 'end_time', 'attendees', 'purpose'];

const PENDING_VALIDATION_STATUS = 'En attente de validation humaine';
const AVAILABLE_ROOM_STATUS = 'Disponible';

export default function RoomRequestForm({ onDone, onCancel, prefill = {} }) {
  const { translate } = useLanguage();
  const { token, contact } = useAccountPrefill();
  const [availability, setAvailability] = useState(null);
  const [bookableRooms, setBookableRooms] = useState(null);
  const formState = useFormState({
    requester_lastname: '', requester_firstname: '', email: '', phone: '', room_id: '',
    requested_date: '', start_time: '', end_time: '', attendees: '', extra_equipment: '', purpose: '',
    ...{ requester_lastname: contact.lastname, requester_firstname: contact.firstname, email: contact.email, phone: contact.phone },
    ...prefill,
  }, { required: REQUIRED_FIELDS });
  const { room_id: selectedRoomId, requested_date: selectedDate, start_time: startTime, end_time: endTime } = formState.values;

  // Créneaux déjà pris : relus régulièrement, car quelqu'un d'autre peut réserver pendant la saisie.
  useEffect(() => {
    if (!selectedRoomId || !selectedDate) { setAvailability(null); return undefined; }
    let isCurrent = true;
    const loadAvailability = () => publicService.getRoomAvailability(selectedRoomId, selectedDate)
      .then((slots) => isCurrent && setAvailability(slots)).catch(() => isCurrent && setAvailability(null));
    loadAvailability();
    const timer = setInterval(loadAvailability, AVAILABILITY_REFRESH_MILLISECONDS);
    return () => { isCurrent = false; clearInterval(timer); };
  }, [selectedRoomId, selectedDate]);

  const conflictingSlot = availability && startTime && endTime
    ? availability.busy.find((slot) => startTime < slot.end_time && endTime > slot.start_time)
    : null;

  useEffect(() => {
    publicService.listRooms()
      .then((rooms) => setBookableRooms(rooms.filter((room) => room.status === AVAILABLE_ROOM_STATUS)))
      .catch(() => setBookableRooms([]));
  }, []);

  const onSubmit = formState.handleSubmit(async (values) => {
    const roomRequest = {
      ...values,
      attendees: Number(values.attendees),
      extra_equipment: values.extra_equipment.split(',').map((item) => item.trim()).filter(Boolean),
    };
    const created = await publicService.submitRoomRequest(roomRequest, token);
    onDone({
      kind: 'room_request', id: created.id, status: PENDING_VALIDATION_STATUS, warnings: created.warnings,
      summary: {
        room: created.room_name, date: values.requested_date, start_time: values.start_time, end_time: values.end_time,
        attendees: roomRequest.attendees, purpose: values.purpose,
        requester: `${values.requester_firstname} ${values.requester_lastname}`,
      },
    });
  });

  if (bookableRooms && bookableRooms.length === 0) {
    return (
      <div className="form">
        <p className="muted">{translate('no_rooms_available')}</p>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{translate('close')}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <div className="form__row">
        <FormField label={translate('f_lastname')} required autoComplete="family-name" error={formState.fieldErrors.requester_lastname} {...formState.bindField('requester_lastname')} />
        <FormField label={translate('f_firstname')} required autoComplete="given-name" error={formState.fieldErrors.requester_firstname} {...formState.bindField('requester_firstname')} />
      </div>
      <div className="form__row">
        <FormField label={translate('f_email')} type="email" required autoComplete="email" error={formState.fieldErrors.email} {...formState.bindField('email')} />
        <FormField label={translate('f_phone')} type="tel" required autoComplete="tel" error={formState.fieldErrors.phone} {...formState.bindField('phone')} />
      </div>
      <FormField as="select" label={translate('f_room')} required error={formState.fieldErrors.room_id} {...formState.bindField('room_id')}>
        <option value="">{translate('choose')}</option>
        {(bookableRooms || []).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
      </FormField>
      <div className="form__row form__row--3">
        <FormField label={translate('f_date')} type="date" required error={formState.fieldErrors.requested_date} {...formState.bindField('requested_date')} />
        <FormField label={translate('f_start')} type="time" required error={formState.fieldErrors.start_time} {...formState.bindField('start_time')} />
        <FormField label={translate('f_end')} type="time" required error={formState.fieldErrors.end_time} {...formState.bindField('end_time')} />
      </div>
      {availability && (
        <p className={`slot-info${conflictingSlot ? ' slot-info--conflict' : ''}`} role="status">
          {availability.busy.length
            ? `${translate('slot_busy')} ${availability.busy.map((slot) => `${slot.start_time}–${slot.end_time}`).join(', ')}`
            : translate('slot_free')}
          {availability.opening_hours && ` · ${translate('slot_open')} ${availability.opening_hours.open_time}–${availability.opening_hours.close_time}`}
          {conflictingSlot && <strong> {translate('slot_conflict')}</strong>}
        </p>
      )}
      <FormField label={translate('f_attendees')} type="number" min="1" required error={formState.fieldErrors.attendees} {...formState.bindField('attendees')} />
      <FormField label={translate('f_equipment')} error={formState.fieldErrors.extra_equipment} {...formState.bindField('extra_equipment')} />
      <FormField as="textarea" label={translate('f_purpose')} required error={formState.fieldErrors.purpose} {...formState.bindField('purpose')} />
      <FormActions error={formState.formError} submitting={formState.submitting} onCancel={onCancel} disabled={Boolean(conflictingSlot)} />
    </form>
  );
}
