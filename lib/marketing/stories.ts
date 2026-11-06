// Founding creator stories for the website. Only real creators, in their own words, with written consent.
// Add an entry only after the creator has approved the exact text and photo; record when consent was given.
// Never paraphrase into claims they didn't make, and never add income figures or results they haven't approved.
export type CreatorStory = {
  name: string; niche: string; image?: string;        // image: a file in /public/stories/ the creator supplied
  challenge: string; experience: string; feedback?: string;
  consentOn: string;                                   // YYYY-MM-DD the creator approved publishing this text and photo
};
export const STORIES: CreatorStory[] = [];
export const publishedStories = () => STORIES.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.consentOn) && s.name && s.experience);
