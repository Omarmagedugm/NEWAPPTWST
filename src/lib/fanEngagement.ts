import { UserProfile, MatchItem, PredictionItem, FanPostItem, PollItem, StoreOrder } from '../store';

export interface FanEngagementStats {
  userId: string;
  userName: string;
  userAvatar?: string;
  email?: string;
  isVerifiedMember?: boolean;
  membershipNumber?: string;
  tier?: string;
  role?: string;
  totalPoints: number;
  predictionsPoints: number;
  postsPoints: number;
  likesReceivedPoints: number;
  likesGivenPoints: number;
  commentsPoints: number;
  pollsPoints: number;
  membershipBonus: number;
  storePoints: number;
  baseActivityBonus: number;
  totalPredictions: number;
  correctScores: number;
  correctOutcomes: number;
  totalPosts: number;
  totalLikesReceived: number;
  totalLikesGiven: number;
  totalComments: number;
  rankBadge: {
    label: string;
    color: string;
    bg: string;
    icon: string;
  };
}

export interface EngagementContext {
  predictions?: (PredictionItem | any)[];
  matches?: (MatchItem | any)[];
  fanPosts?: (FanPostItem | any)[];
  fanComments?: any[];
  comments?: any[];
  polls?: (PollItem | any)[];
  orders?: (StoreOrder | any)[];
  attendancePoll?: any;
}

const DEFAULT_COMMUNITY_FANS: (Partial<UserProfile> & {
  defaultPosts?: number;
  defaultLikesReceived?: number;
  defaultLikesGiven?: number;
  defaultPredictions?: number;
  defaultCorrectScores?: number;
})[] = [
  {
    uid: 'fan_leader_1',
    name: 'محمود الشاطبي 👑',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: 'shatby.fan@ittihad.club',
    isVerifiedMember: true,
    membershipNumber: 'SC-88192',
    tier: 'diamond',
    points: 1250,
    defaultPosts: 12,
    defaultLikesReceived: 86,
    defaultLikesGiven: 45,
    defaultPredictions: 18,
    defaultCorrectScores: 9
  },
  {
    uid: 'fan_leader_2',
    name: 'أحمد الإسكندراني ⚽',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'ahmed.alex@ittihad.club',
    isVerifiedMember: true,
    membershipNumber: 'SC-65412',
    tier: 'gold',
    points: 980,
    defaultPosts: 9,
    defaultLikesReceived: 64,
    defaultLikesGiven: 38,
    defaultPredictions: 15,
    defaultCorrectScores: 6
  },
  {
    uid: 'fan_leader_3',
    name: 'كابتن حودة زعيم الثغر 🏆',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: 'houda.thaghre@ittihad.club',
    isVerifiedMember: true,
    membershipNumber: 'SC-99014',
    tier: 'gold',
    points: 840,
    defaultPosts: 7,
    defaultLikesReceived: 52,
    defaultLikesGiven: 29,
    defaultPredictions: 12,
    defaultCorrectScores: 5
  },
  {
    uid: 'fan_leader_4',
    name: 'سارة الخضراء 💚',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    email: 'sara.green@ittihad.club',
    isVerifiedMember: false,
    tier: 'silver',
    points: 620,
    defaultPosts: 5,
    defaultLikesReceived: 38,
    defaultLikesGiven: 22,
    defaultPredictions: 9,
    defaultCorrectScores: 3
  },
  {
    uid: 'fan_leader_5',
    name: 'عماد الشاذلي 🏟️',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    email: 'emad.shazly@ittihad.club',
    isVerifiedMember: true,
    membershipNumber: 'SC-33109',
    tier: 'silver',
    points: 510,
    defaultPosts: 4,
    defaultLikesReceived: 27,
    defaultLikesGiven: 19,
    defaultPredictions: 8,
    defaultCorrectScores: 2
  },
  {
    uid: 'fan_leader_6',
    name: 'طارق محرم بك ⚡',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    email: 'tarek.moharem@ittihad.club',
    isVerifiedMember: false,
    tier: 'bronze',
    points: 390,
    defaultPosts: 3,
    defaultLikesReceived: 18,
    defaultLikesGiven: 14,
    defaultPredictions: 6,
    defaultCorrectScores: 2
  }
];

/**
 * Deterministic baseline points generator for real user profiles
 * to reflect realistic engagement based on account metadata, age, and profile completeness.
 */
function getDeterministicBaseline(user: Partial<UserProfile> & { id?: string }): number {
  if (!user) return 50;
  
  let base = 75; // Baseline welcome loyalty points

  // Extra points for profile completeness
  if (user.avatar && user.avatar.trim() !== '' && !user.avatar.includes('ui-avatars.com')) {
    base += 40;
  }
  if (user.bio && user.bio.trim() !== '') {
    base += 30;
  }
  if (user.phone && user.phone.trim() !== '') {
    base += 35;
  }
  if (user.location && user.location.trim() !== '') {
    base += 20;
  }

  // Bonus for user tier
  const tier = user.tier || 'new';
  if (tier === 'premium' || tier === 'diamond') base += 250;
  else if (tier === 'gold') base += 180;
  else if (tier === 'silver') base += 120;
  else if (tier === 'bronze') base += 80;

  // Bonus for membership verification
  if (user.isVerifiedMember || (user.membershipNumber && user.membershipNumber.trim() !== '')) {
    base += 150;
  }

  // Pseudo-random consistency based on user identifier string to give natural realistic point granularity
  const str = (user.uid || user.id || user.email || user.name || 'ittihad');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const naturalVariance = Math.abs(hash % 45);

  return base + naturalVariance;
}

/**
 * Assign appropriate fan ranking badge based on total loyalty points
 */
export function getFanRankBadge(points: number, isVerifiedMember?: boolean): { label: string; color: string; bg: string; icon: string } {
  if (isVerifiedMember && points >= 1000) {
    return { label: 'سفير سيد البلد 👑', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', icon: 'crown' };
  }
  if (points >= 1500) {
    return { label: 'أسطورة المدرج 🏆', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', icon: 'trophy' };
  }
  if (points >= 900) {
    return { label: 'مشجع ماسي 💎', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30', icon: 'diamond' };
  }
  if (points >= 500) {
    return { label: 'مشجع ذهبي 🥇', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: 'medal' };
  }
  if (points >= 250) {
    return { label: 'مشجع وفي 🥈', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: 'heart' };
  }
  return { label: 'مشجع واعد ⚡', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30', icon: 'zap' };
}

/**
 * Calculate detailed engagement points for a single user
 */
export function calculateUserEngagement(
  user: Partial<UserProfile> & { id?: string },
  context: EngagementContext = {}
): FanEngagementStats {
  const {
    predictions = [],
    matches = [],
    fanPosts = [],
    fanComments = [],
    comments = [],
    polls = [],
    orders = [],
  } = context;

  const uid = user.uid || user.id || '';
  const userName = user.name || (user as any).username || 'مشجع إتحاداوي';
  const email = user.email || '';

  // Match identifiers helper
  const isMatchUser = (itemUserId?: string, itemUserName?: string, itemEmail?: string) => {
    if (uid && itemUserId && (itemUserId === uid || itemUserId === (user as any).id)) return true;
    if (email && itemEmail && itemEmail.toLowerCase() === email.toLowerCase()) return true;
    if (userName && itemUserName && itemUserName.trim().toLowerCase() === userName.trim().toLowerCase()) return true;
    return false;
  };

  // 1. Predictions Calculation
  let predictionsPoints = 0;
  let correctScores = 0;
  let correctOutcomes = 0;
  let userPredictionsCount = 0;

  const userPredictions = predictions.filter(p => isMatchUser(p.userId, p.userName));
  userPredictionsCount = userPredictions.length;

  userPredictions.forEach(pred => {
    // 10 pts for submitting a prediction
    predictionsPoints += 10;

    const match = matches.find(m => m.id === pred.matchId);
    if (match && match.status === 'finished') {
      const actualHome = Number(match.homeScore);
      const actualAway = Number(match.awayScore);
      const predHome = Number(pred.homeScore);
      const predAway = Number(pred.awayScore);

      const isExact = !isNaN(actualHome) && !isNaN(predHome) && actualHome === predHome && actualAway === predAway;
      
      const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
      const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
      const isOutcome = !isNaN(actualHome) && !isNaN(predHome) && actualWinner === predWinner;

      if (isExact) {
        correctScores += 1;
        predictionsPoints += 50; // 50 pts for exact score
      } else if (isOutcome) {
        correctOutcomes += 1;
        predictionsPoints += 25; // 25 pts for winning team / draw outcome
      }
    }
  });

  // 2. FanZone Posts, Likes received & Likes given (made by user)
  let postsPoints = 0;
  let likesReceivedPoints = 0;
  let likesGivenPoints = 0;
  let totalLikesReceived = 0;
  let totalLikesGiven = 0;
  
  const userPosts = fanPosts.filter(post => isMatchUser(post.userId, post.userName));
  let totalPosts = userPosts.length;
  
  userPosts.forEach(post => {
    postsPoints += 20; // 20 pts per post created
    const likes = Array.isArray(post.likedBy) ? Math.max(post.likedBy.length, Number(post.likes || 0)) : Number(post.likes || 0);
    totalLikesReceived += likes;
    likesReceivedPoints += (likes * 5); // 5 pts per like received
  });

  // Real count of likes the user has made (given) on posts
  fanPosts.forEach(post => {
    if (Array.isArray(post.likedBy)) {
      if ((uid && post.likedBy.includes(uid)) || (userName && post.likedBy.includes(userName))) {
        totalLikesGiven += 1;
      }
    }
  });

  // Real count of likes the user has made on comments
  if (Array.isArray(fanComments)) {
    fanComments.forEach(comment => {
      if (Array.isArray(comment.likedBy)) {
        if ((uid && comment.likedBy.includes(uid)) || (userName && comment.likedBy.includes(userName))) {
          totalLikesGiven += 1;
        }
      }
    });
  }

  // Fallback defaults for mock baseline leaders if zero real records exist
  const mockUser = user as any;
  if (totalPosts === 0 && mockUser.defaultPosts) {
    totalPosts = mockUser.defaultPosts;
    postsPoints = totalPosts * 20;
  }
  if (totalLikesReceived === 0 && mockUser.defaultLikesReceived) {
    totalLikesReceived = mockUser.defaultLikesReceived;
    likesReceivedPoints = totalLikesReceived * 5;
  }
  if (totalLikesGiven === 0 && mockUser.defaultLikesGiven) {
    totalLikesGiven = mockUser.defaultLikesGiven;
  }
  if (userPredictionsCount === 0 && mockUser.defaultPredictions) {
    userPredictionsCount = mockUser.defaultPredictions;
    predictionsPoints += userPredictionsCount * 10;
  }
  if (correctScores === 0 && mockUser.defaultCorrectScores) {
    correctScores = mockUser.defaultCorrectScores;
    predictionsPoints += correctScores * 50;
  }

  likesGivenPoints = totalLikesGiven * 2; // 2 pts per like given

  // 3. Comments written by user
  let commentsPoints = 0;
  let totalComments = 0;

  if (Array.isArray(fanComments)) {
    const userFanComments = fanComments.filter(c => isMatchUser(c.userId, c.userName, c.userEmail));
    totalComments += userFanComments.length;
    commentsPoints += userFanComments.length * 5; // 5 pts per comment
  }

  if (Array.isArray(comments)) {
    const userLiveComments = comments.filter(c => isMatchUser(c.userId, c.userName, c.userEmail));
    totalComments += userLiveComments.length;
    commentsPoints += userLiveComments.length * 5;
  }

  // 4. Polls Votes
  let pollsPoints = 0;
  polls.forEach(poll => {
    if (poll.votes && uid && (poll.votes[uid] !== undefined || (poll.votes as any)[email])) {
      pollsPoints += 15; // 15 pts per poll vote
    }
  });

  // 5. Store orders
  let storePoints = 0;
  if (Array.isArray(orders)) {
    const userOrders = orders.filter(o => isMatchUser(o.userId, o.customerName, o.customerEmail));
    storePoints += userOrders.length * 50; // 50 pts per store order
  }

  // 6. Club Membership bonus
  const isVerifiedMember = Boolean(user.isVerifiedMember || (user.membershipNumber && user.membershipNumber.trim() !== ''));
  const membershipBonus = isVerifiedMember ? 200 : 0;

  // 7. Base activity bonus & stored points
  const baseActivityBonus = getDeterministicBaseline(user);
  const storedPoints = Number(user.points || 0);

  // Total points calculation
  const totalPoints = predictionsPoints +
    postsPoints +
    likesReceivedPoints +
    likesGivenPoints +
    commentsPoints +
    pollsPoints +
    storePoints +
    membershipBonus +
    baseActivityBonus +
    storedPoints;

  const rankBadge = getFanRankBadge(totalPoints, isVerifiedMember);

  return {
    userId: uid,
    userName,
    userAvatar: user.avatar,
    email: user.email,
    isVerifiedMember,
    membershipNumber: user.membershipNumber,
    tier: user.tier,
    role: user.role,
    totalPoints,
    predictionsPoints,
    postsPoints,
    likesReceivedPoints,
    likesGivenPoints,
    commentsPoints,
    pollsPoints,
    membershipBonus,
    storePoints,
    baseActivityBonus,
    totalPredictions: userPredictionsCount,
    correctScores,
    correctOutcomes,
    totalPosts,
    totalLikesReceived,
    totalLikesGiven,
    totalComments,
    rankBadge
  };
}

/**
 * Calculate Leaderboard ranking for a list of users, automatically merging
 * active participants from predictions and posts and community anchors.
 */
export function calculateTopActiveFans(
  users: (UserProfile | any)[],
  context: EngagementContext = {},
  limit: number = 50
): FanEngagementStats[] {
  const userMap = new Map<string, Partial<UserProfile>>();

  // 1. Add provided users
  if (Array.isArray(users)) {
    users.forEach(u => {
      const key = u.uid || u.id || u.email || u.name;
      if (key) userMap.set(key, u);
    });
  }

  // 2. Extract active participants from predictions
  if (Array.isArray(context.predictions)) {
    context.predictions.forEach(p => {
      const key = p.userId || p.userName;
      if (key && !userMap.has(key)) {
        userMap.set(key, {
          uid: p.userId || `pred_${key}`,
          name: p.userName || 'مشجع إتحاداوي',
          avatar: p.userAvatar || ''
        });
      }
    });
  }

  // 3. Extract active authors from fanPosts
  if (Array.isArray(context.fanPosts)) {
    context.fanPosts.forEach(post => {
      const key = post.userId || post.userName;
      if (key && !userMap.has(key)) {
        userMap.set(key, {
          uid: post.userId || `post_${key}`,
          name: post.userName || 'مشجع إتحاداوي',
          avatar: post.userAvatar || ''
        });
      }
    });
  }

  // 4. If community pool has fewer than 6 fans, add default community leaders
  if (userMap.size < 6) {
    DEFAULT_COMMUNITY_FANS.forEach(df => {
      if (!userMap.has(df.uid!) && !userMap.has(df.name!)) {
        userMap.set(df.uid!, df);
      }
    });
  }

  const allCandidateUsers = Array.from(userMap.values());
  const calculated = allCandidateUsers.map(user => calculateUserEngagement(user, context));

  // Sort descending by total points, then predictions, then posts, then likes
  calculated.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.correctScores !== a.correctScores) return b.correctScores - a.correctScores;
    if (b.totalPredictions !== a.totalPredictions) return b.totalPredictions - a.totalPredictions;
    if (b.totalLikesReceived !== a.totalLikesReceived) return b.totalLikesReceived - a.totalLikesReceived;
    return b.totalPosts - a.totalPosts;
  });

  return calculated.slice(0, limit);
}
