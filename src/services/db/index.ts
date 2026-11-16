// ==============================================================================
// KAWKAB TALTA E3DADI — MODULAR DATABASE SERVICES (BARREL EXPORT)
// Clean domain-driven architecture for the application backend.
// ==============================================================================

export { storageEngine, STORAGE_KEYS, generateUUID } from './storageEngine';
export { curriculumService, INITIAL_SUBJECTS } from './curriculumService';
export { examService } from './examService';
export { profileService, INITIAL_PROFILES, INITIAL_PLANS, INITIAL_CONTACT_SETTINGS } from './profileService';
export { teacherService, INITIAL_TEACHER_ASSIGNMENTS } from './teacherService';
export { socialService, INITIAL_ANNOUNCEMENTS } from './socialService';
export { INITIAL_FLASHCARDS } from './initialFlashcards';
