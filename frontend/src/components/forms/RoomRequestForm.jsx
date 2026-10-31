import { useEffect, useState } from 'react';
import FormField from '../FormField.jsx';
import FormActions from './FormActions.jsx';
import { useFormState } from './useFormState.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { publicService } from '../../services/publicService.js';

const PENDING_VALIDATION_STATUS = 'En attente de validation humaine';
const AVAILABLE_ROOM_STATUS = 'Disponible';

export default function RoomRequestForm({ onDone, onCancel }) {
  const { translate } = useLanguage();
  const [bookableRooms, setBookableRooms] = useState(null);
  const formState = useFormState({
    requester_lastname: '', requester_firstname: '', email: '', phone: '', room_id: '',
    requested_date: '', start_time: '', end_time: '', attendees: '', extra_equipment: '', purpose: '',
  });

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
    const created = await publicService.submitRoomRequest(roomRequest);
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
      <FormField label={translate('f_attendees')} type="number" min="1" required error={formState.fieldErrors.attendees} {...formState.bindField('attendees')} />
      <FormField label={translate('f_equipment')} error={formState.fieldErrors.extra_equipment} {...formState.bindField('extra_equipment')} />
      <FormField as="textarea" label={translate('f_purpose')} required error={formState.fieldErrors.purpose} {...formState.bindField('purpose')} />
      <FormActions error={formState.formError} submitting={formState.submitting} onCancel={onCancel} />
    </form>
  );
}
