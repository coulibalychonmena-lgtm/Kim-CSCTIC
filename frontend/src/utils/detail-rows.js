// Lignes de la fiche complète d'un espace ou d'une formation (fonction pure, testée dans tests/detail-rows.test.mjs).
/** Uniquement les lignes renseignées : rien n'est inventé ni affiché « — ». */
export function detailRows(kind, item, translate) {
  const audience = item.age_range_label
    || (item.age_min !== null && item.age_min !== undefined || item.age_max !== null && item.age_max !== undefined
      ? `${item.age_min ?? '?'}–${item.age_max ?? '?'}` : null);
  const rows = kind === 'room'
    ? [
      [translate('lbl_type'), item.space_type],
      [translate('capacity'), item.max_capacity ? `${item.max_capacity} ${translate('persons')}` : null],
      [translate('lbl_surface'), item.surface_m2 ? `${item.surface_m2} m²` : null],
      [translate('lbl_equipment'), item.equipment?.length ? item.equipment : null],
      [translate('lbl_price'), item.pricing],
      [translate('lbl_conditions'), item.conditions],
    ]
    : [
      [translate('lbl_category'), item.category],
      [translate('lbl_audience'), audience],
      [translate('lbl_schedule'), item.schedule],
      [translate('lbl_duration'), item.duration],
      [translate('lbl_price'), item.price],
      [translate('lbl_prerequisites'), item.prerequisites],
      [translate('lbl_enrollment'), item.enrollment_conditions],
      [translate('lbl_seats'), item.remaining_seats !== null && item.remaining_seats !== undefined ? `${item.remaining_seats} ${translate('seats_left')}` : null],
    ];
  return rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
}

