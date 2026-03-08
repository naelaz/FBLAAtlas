import { EventItem, MemberProfile, NewsItem, ResourceItem, SocialChannel } from '../types';

export const DEMO_PASSWORD = 'Fbla2026!';

export function seededProfile(memberId: string, email: string): MemberProfile {
  return {
    id: memberId,
    fullName: 'FBLA Member',
    email,
    chapterRole: 'Competitor',
    interests: ['Leadership', 'Mobile Development', 'Public Speaking'],
    achievementBadges: ['NLC Ready', 'Chapter Contributor', 'Design Sprint'],
    highContrastEnabled: false,
    largeTextEnabled: false,
    reduceMotionEnabled: false,
    readableFontEnabled: false,
    largerTouchTargetsEnabled: false,
    voiceAssistEnabled: false,
  };
}

export const EVENTS: EventItem[] = [
  {
    id: 'ev_kickoff',
    title: 'Chapter Kickoff Meeting',
    description: 'Launch goals, officer updates, and competition prep checklist.',
    location: 'Room 204',
    startDate: new Date(2026, 8, 12, 15, 30).toISOString(),
    endDate: new Date(2026, 8, 12, 17, 0).toISOString(),
    isCompetition: false,
  },
  {
    id: 'ev_mock',
    title: 'Mobile App Mock Presentation',
    description: 'Practice the 7-minute deck and 3-minute Q&A segment.',
    location: 'Library Innovation Lab',
    startDate: new Date(2026, 9, 7, 16, 0).toISOString(),
    endDate: new Date(2026, 9, 7, 17, 30).toISOString(),
    isCompetition: true,
  },
  {
    id: 'ev_regionals',
    title: 'Regional Submission Deadline',
    description: 'Finalize app build, documentation, and citation package.',
    location: 'Online Portal',
    startDate: new Date(2026, 10, 3, 21, 0).toISOString(),
    endDate: new Date(2026, 10, 3, 23, 0).toISOString(),
    isCompetition: true,
  },
  {
    id: 'ev_state',
    title: 'State Leadership Conference',
    description: 'In-person preliminary presentation and networking.',
    location: 'Convention Center',
    startDate: new Date(2027, 1, 19, 8, 0).toISOString(),
    endDate: new Date(2027, 1, 20, 18, 0).toISOString(),
    isCompetition: true,
  },
].sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));

export const RESOURCES: ResourceItem[] = [
  {
    id: 'res_cepp',
    title: 'Competitive Events Policy & Procedures',
    description: 'Eligibility, judging standards, and event protocol details.',
    category: 'Competition',
    url: 'https://www.fbla.org/competitive-events',
    offlineAvailable: true,
  },
  {
    id: 'res_dress',
    title: 'FBLA Dress Code Reference',
    description: 'Checklist to avoid dress code penalty points.',
    category: 'Competition',
    url: 'https://www.fbla.org/dress-code',
    offlineAvailable: true,
  },
  {
    id: 'res_lead',
    title: 'Leadership Toolkit',
    description: 'Project planning templates and officer guides.',
    category: 'Leadership',
    url: 'https://www.fbla.org/resources',
    offlineAvailable: true,
  },
  {
    id: 'res_cs',
    title: 'Code.org CS Pathways',
    description: 'Computer science curriculum and school adoption resources.',
    category: 'Learning',
    url: 'https://code.org',
    offlineAvailable: false,
  },
];

export const NEWS: NewsItem[] = [
  {
    id: 'news_1',
    title: 'Chapter Officer Election Window Opens',
    body: 'Submit officer interest forms by Friday and prepare your campaign pitch.',
    category: 'Chapter',
    source: 'Advisor Bulletin',
    publishedAt: new Date(2026, 7, 28).toISOString(),
  },
  {
    id: 'news_2',
    title: 'Practice Deck Review Session Added',
    body: 'A peer review session has been added to help teams tighten timing and flow.',
    category: 'Competition',
    source: 'Competition Committee',
    publishedAt: new Date(2026, 8, 30).toISOString(),
  },
  {
    id: 'news_3',
    title: 'Volunteer Drive for Community Service',
    body: 'Sign up for weekend volunteer slots and log your impact hours.',
    category: 'Service',
    source: 'Chapter News',
    publishedAt: new Date(2026, 9, 15).toISOString(),
  },
].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    id: 'social_instagram',
    platform: 'Instagram',
    handle: '@fbla',
    appUri: 'instagram://user?username=fbla',
    webUri: 'https://www.instagram.com/fbla/',
    feedUri: 'https://www.instagram.com/fbla/',
    description: 'Photo updates and event highlights from chapters.',
  },
  {
    id: 'social_tiktok',
    platform: 'TikTok',
    handle: '@futurebusinessleaders',
    appUri: 'snssdk1233://user/profile/6808000507902331909',
    webUri: 'https://www.tiktok.com/@futurebusinessleaders',
    feedUri: 'https://www.tiktok.com/@futurebusinessleaders',
    description: 'Short videos and challenge recaps.',
  },
  {
    id: 'social_linkedin',
    platform: 'LinkedIn',
    handle: 'FBLA',
    appUri: 'linkedin://company/229355',
    webUri: 'https://www.linkedin.com/company/fbla-pbl/',
    feedUri: 'https://www.linkedin.com/company/fbla-pbl/posts/',
    description: 'Career-oriented updates and professional network posts.',
  },
  {
    id: 'social_youtube',
    platform: 'YouTube',
    handle: '@FBLANational',
    appUri: 'vnd.youtube://www.youtube.com/@FBLANational',
    webUri: 'https://www.youtube.com/@FBLANational',
    feedUri: 'https://www.youtube.com/@FBLANational/videos',
    description: 'Competition tips, highlights, and chapter spotlights.',
  },
  {
    id: 'social_facebook',
    platform: 'Facebook',
    handle: 'FBLA-PBL',
    appUri: 'fb://page/728420593878224',
    webUri: 'https://www.facebook.com/FBLA-PBL',
    feedUri: 'https://www.facebook.com/FBLA-PBL',
    description: 'Announcements and community updates from FBLA.',
  },
];
