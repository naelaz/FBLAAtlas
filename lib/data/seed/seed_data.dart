import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/member_profile.dart';
import 'package:fbla_atlas/domain/models/news_item.dart';
import 'package:fbla_atlas/domain/models/resource_item.dart';
import 'package:fbla_atlas/domain/models/social_channel.dart';

class SeedData {
  static MemberProfile profileForMember({
    required String memberId,
    required String email,
  }) {
    return MemberProfile(
      id: memberId,
      fullName: 'FBLA Member',
      email: email,
      chapterRole: 'Competitor',
      interests: const <String>['Leadership', 'Mobile Development', 'Public Speaking'],
      achievementBadges: const <String>[
        'NLC Ready',
        'Chapter Contributor',
        'Design Sprint',
      ],
      highContrastEnabled: false,
      largeTextEnabled: false,
    );
  }

  static List<EventItem> events() {
    return <EventItem>[
      EventItem(
        id: 'ev_kickoff',
        title: 'Chapter Kickoff Meeting',
        description: 'Launch goals, officer updates, and competition prep checklist.',
        location: 'Room 204',
        startDate: DateTime(2026, 9, 12, 15, 30),
        endDate: DateTime(2026, 9, 12, 17, 0),
        isCompetition: false,
      ),
      EventItem(
        id: 'ev_mock',
        title: 'Mobile App Mock Presentation',
        description: 'Practice the 7-minute deck and the 3-minute judge Q&A segment.',
        location: 'Library Innovation Lab',
        startDate: DateTime(2026, 10, 7, 16, 0),
        endDate: DateTime(2026, 10, 7, 17, 30),
        isCompetition: true,
      ),
      EventItem(
        id: 'ev_regionals',
        title: 'Regional Conference Submission Deadline',
        description: 'Finalize app build, README package, and citation documentation.',
        location: 'Online Portal',
        startDate: DateTime(2026, 11, 3, 21, 0),
        endDate: DateTime(2026, 11, 3, 23, 0),
        isCompetition: true,
      ),
      EventItem(
        id: 'ev_state',
        title: 'State Leadership Conference',
        description: 'In-person preliminary presentation and networking session.',
        location: 'Convention Center',
        startDate: DateTime(2027, 2, 19, 8, 0),
        endDate: DateTime(2027, 2, 20, 18, 0),
        isCompetition: true,
      ),
    ]..sort((a, b) => a.startDate.compareTo(b.startDate));
  }

  static List<ResourceItem> resources() {
    return const <ResourceItem>[
      ResourceItem(
        id: 'res_cepp',
        title: 'Competitive Events Policy & Procedures',
        description: 'Eligibility, judging standards, and event protocol details.',
        category: 'Competition',
        url: 'https://www.fbla.org/competitive-events',
        offlineAvailable: true,
      ),
      ResourceItem(
        id: 'res_dress',
        title: 'FBLA Dress Code Reference',
        description: 'Checklist to avoid dress code penalty points.',
        category: 'Competition',
        url: 'https://www.fbla.org/dress-code',
        offlineAvailable: true,
      ),
      ResourceItem(
        id: 'res_lead',
        title: 'Leadership Toolkit',
        description: 'Project planning templates, chapter officer guides, and collaboration tips.',
        category: 'Leadership',
        url: 'https://www.fbla.org/resources',
        offlineAvailable: true,
      ),
      ResourceItem(
        id: 'res_cs',
        title: 'Code.org CS Pathways',
        description: 'Computer science curriculum and school adoption resources.',
        category: 'Learning',
        url: 'https://code.org',
        offlineAvailable: false,
      ),
    ];
  }

  static List<NewsItem> news() {
    return <NewsItem>[
      NewsItem(
        id: 'news_1',
        title: 'Chapter Officer Election Window Opens',
        body: 'Submit officer interest forms by Friday and prepare your campaign pitch.',
        category: 'Chapter',
        source: 'Advisor Bulletin',
        publishedAt: DateTime(2026, 8, 28),
      ),
      NewsItem(
        id: 'news_2',
        title: 'Practice Deck Review Session Added',
        body: 'A peer review session has been added to help teams tighten flow and timing.',
        category: 'Competition',
        source: 'Competition Committee',
        publishedAt: DateTime(2026, 9, 30),
      ),
      NewsItem(
        id: 'news_3',
        title: 'Volunteer Drive for Community Service',
        body: 'Sign up for weekend volunteer slots and log your impact hours in the chapter log.',
        category: 'Service',
        source: 'Chapter News',
        publishedAt: DateTime(2026, 10, 15),
      ),
    ]..sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
  }

  static List<SocialChannel> socialChannels() {
    return const <SocialChannel>[
      SocialChannel(
        id: 'social_instagram',
        platform: 'Instagram',
        handle: '@fbla',
        appUri: 'instagram://user?username=fbla',
        webUri: 'https://www.instagram.com/fbla/',
        description: 'Photo updates and event highlights from chapters.',
      ),
      SocialChannel(
        id: 'social_tiktok',
        platform: 'TikTok',
        handle: '@futurebusinessleaders',
        appUri: 'snssdk1233://user/profile/6808000507902331909',
        webUri: 'https://www.tiktok.com/@futurebusinessleaders',
        description: 'Short videos and challenge recaps.',
      ),
      SocialChannel(
        id: 'social_linkedin',
        platform: 'LinkedIn',
        handle: 'FBLA',
        appUri: 'linkedin://company/229355',
        webUri: 'https://www.linkedin.com/company/fbla-pbl/',
        description: 'Career-oriented updates and professional network posts.',
      ),
    ];
  }
}
