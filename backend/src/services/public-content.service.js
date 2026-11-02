import * as roomsService from './rooms.service.js';
import * as activitiesService from './activities.service.js';
import * as centerInformationService from './center-information.service.js';
import { eventsService, newsService, videosService, suggestionsService } from './entries.service.js';
import { translateRows } from './translation.service.js';

/** Contenu public saisi par l'administration (en français), traduit automatiquement dans la langue du visiteur. */
export const publicRooms = async (language) =>
  translateRows(await roomsService.listRooms(), ['name', 'space_type', 'description', 'pricing', 'equipment'], language);

export const publicActivities = async (language) =>
  translateRows(await activitiesService.listActivities(), ['title', 'category', 'description', 'schedule', 'enrollment_conditions', 'age_range_label'], language);

export const publicCenterInformation = async (language) =>
  translateRows(await centerInformationService.listCenterInformation(), ['title', 'content', 'source_label'], language);

export const publicEvents = async (language) => translateRows(await eventsService.listPublished(), ['title', 'description', 'location'], language);
export const publicNews = async (language) => translateRows(await newsService.listPublished(), ['title', 'summary', 'content'], language);
export const publicVideos = async (language) => translateRows(await videosService.listPublished(), ['title', 'description'], language);

/** Suggestions du chat : un texte saisi à la main en anglais/coréen est préféré, sinon traduction automatique. */
export async function publicSuggestions(language) {
  const suggestions = await suggestionsService.listPublished();
  if (language === 'fr') return suggestions;
  const manualLabelOf = (suggestion) => (language === 'en' ? suggestion.label_en : language === 'ko' ? suggestion.label_ko : null);
  const needingTranslation = suggestions.filter((suggestion) => !manualLabelOf(suggestion));
  const translatedById = new Map((await translateRows(needingTranslation, ['label', 'message'], language)).map((suggestion) => [suggestion.id, suggestion]));
  return suggestions.map((suggestion) => (manualLabelOf(suggestion) ? { ...suggestion, label: manualLabelOf(suggestion) } : translatedById.get(suggestion.id)));
}

export const publicLoaders = [publicRooms, publicActivities, publicCenterInformation, publicEvents, publicNews, publicVideos, publicSuggestions];
