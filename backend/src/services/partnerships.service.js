import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';

const NEW_PARTNERSHIP_STATUS = 'Nouveau';

export async function createPartnership(partnershipData) {
  const partnershipId = generateIdentifier();
  await query(
    `INSERT INTO PARTNERSHIP_REQUESTS
       (ID, ORGANIZATION, CONTACT_NAME, EMAIL, PHONE, PARTNERSHIP_TYPE, DESCRIPTION, STATUS)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      partnershipId, partnershipData.organization, partnershipData.contact_name, partnershipData.email,
      partnershipData.phone || null, partnershipData.partnership_type, partnershipData.description, NEW_PARTNERSHIP_STATUS,
    ],
  );
  return { id: partnershipId, status: NEW_PARTNERSHIP_STATUS };
}

export const listPartnerships = (statusFilter) =>
  query(
    `SELECT ID, ORGANIZATION, CONTACT_NAME, EMAIL, PHONE, PARTNERSHIP_TYPE, DESCRIPTION, STATUS, RECEIVED_AT
     FROM PARTNERSHIP_REQUESTS WHERE (?::text IS NULL OR STATUS = ?) ORDER BY RECEIVED_AT DESC`,
    [statusFilter || null, statusFilter || null],
  );

export async function updatePartnershipStatus(partnershipId, newStatus) {
  const [existingPartnership] = await query('SELECT ID FROM PARTNERSHIP_REQUESTS WHERE ID = ?', [partnershipId]);
  if (!existingPartnership) throw new AppError(404, 'Proposition introuvable.');
  await query('UPDATE PARTNERSHIP_REQUESTS SET STATUS = ? WHERE ID = ?', [newStatus, partnershipId]);
  return { id: partnershipId, status: newStatus };
}
