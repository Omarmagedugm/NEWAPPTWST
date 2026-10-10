import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, updateDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppStore } from '../store';

export function useFirestoreSync() {
  const isInitialFetchDoneRef = useRef(false);

  // 1. Ultra-fast Tiered Public / Global Data Sync
  useEffect(() => {
    let isMounted = true;
    const unsubs: (() => void)[] = [];
    const getStore = () => useAppStore.getState();

    // Helper for safe snapshot subscription
    const subscribeSnapshot = (
      docOrQuery: any, 
      onNext: (snap: any) => void, 
      path: string, 
      op: OperationType = OperationType.LIST
    ) => {
      try {
        const unsub = onSnapshot(
          docOrQuery, 
          (snap) => {
            if (!isMounted) return;
            try {
              onNext(snap);
            } catch (e) {
              console.warn(`Snapshot callback error for ${path}:`, e);
            }
          }, 
          (err) => {
            if (err?.code !== 'permission-denied') {
              handleFirestoreError(err, op, path);
            }
            if (isMounted) getStore().setDataLoaded(true);
          }
        );
        unsubs.push(unsub);
        return unsub;
      } catch (err) {
        handleFirestoreError(err, op, path);
        if (isMounted) getStore().setDataLoaded(true);
        return () => {};
      }
    };

    // Safety watchdog: unlock the UI after 400ms regardless of network speed
    const fastUnlockTimer = setTimeout(() => {
      if (isMounted) {
        getStore().setDataLoaded(true);
      }
    }, 400);

    // ==========================================
    // TIER 1: CRITICAL CORE (Runs Immediately)
    // Only 4 single docs + 3 lightweight collections
    // ==========================================

    // 1. Home Layout
    subscribeSnapshot(doc(db, 'settings', 'homeLayout'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.sections)) {
          const sortedSections = [...data.sections].sort((a: any, b: any) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (a.order ?? 0) - (b.order ?? 0);
          });
          getStore().setHomeSections(sortedSections);
        }
      }
      if (isMounted) getStore().setDataLoaded(true);
    }, 'settings/homeLayout', OperationType.GET);

    // 2. Global App Settings
    subscribeSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data) getStore().setSettings({ id: snap.id, ...data });
      }
    }, 'settings/global', OperationType.GET);

    // 3. Centralized Section Flags
    subscribeSnapshot(doc(db, 'appSettings', 'sections'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        getStore().setSectionFlags({
          fanServices: data.fanServices !== false,
          worldFans: data.worldFans !== false,
          fanStore: data.fanStore !== false,
          itthadawyBusiness: data.itthadawyBusiness !== false,
          ...data
        });
      }
    }, 'appSettings/sections', OperationType.GET);

    // 4. Live Stream Channels (Immediate sync so channel visibility/hiding is applied without delay)
    subscribeSnapshot(doc(db, 'settings', 'liveStream'), (snap) => {
      if (snap.exists()) getStore().updateLiveStreams({ football: snap.data() as any });
    }, 'settings/liveStream', OperationType.GET);

    subscribeSnapshot(doc(db, 'settings', 'liveStream_football'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const current = getStore().liveStreams?.football as any;
        if (!current?.updatedAt || !data?.updatedAt || data.updatedAt >= current.updatedAt) {
          getStore().updateLiveStreams({ football: data as any });
        }
      }
    }, 'settings/liveStream_football', OperationType.GET);

    subscribeSnapshot(doc(db, 'settings', 'liveStream_basketball'), (snap) => {
      if (snap.exists()) getStore().updateLiveStreams({ basketball: snap.data() as any });
    }, 'settings/liveStream_basketball', OperationType.GET);

    subscribeSnapshot(doc(db, 'settings', 'liveStream_programs'), (snap) => {
      if (snap.exists()) getStore().updateLiveStreams({ programs: snap.data() as any });
    }, 'settings/liveStream_programs', OperationType.GET);

    subscribeSnapshot(doc(db, 'settings', 'liveStream_custom'), (snap) => {
      if (snap.exists()) getStore().updateLiveStreams({ custom: snap.data() as any });
    }, 'settings/liveStream_custom', OperationType.GET);

    // 5. Matches (Strict limit: 25 recent items)
    subscribeSnapshot(
      query(collection(db, 'matches'), orderBy('date', 'desc'), limit(25)), 
      (snap) => {
        getStore().setMatches(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
        if (isMounted) getStore().setDataLoaded(true);
      }, 
      'matches'
    );

    // 6. News (Strict limit: 20 recent items)
    subscribeSnapshot(
      query(collection(db, 'news'), orderBy('date', 'desc'), limit(20)), 
      (snap) => {
        getStore().setNews(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
        if (isMounted) getStore().setDataLoaded(true);
      }, 
      'news'
    );

    // 7. Active Ads (Strict limit: 10 items)
    subscribeSnapshot(
      query(collection(db, 'ads'), where('active', '==', true), orderBy('order', 'asc'), limit(10)),
      (snap) => {
        getStore().setAds(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'ads'
    );

    // 8. Media items (Real-time sync for all gallery photos & videos)
    subscribeSnapshot(
      query(collection(db, 'media')),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        items.sort((a: any, b: any) => {
          const timeA = a.date ? new Date(a.date).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.date ? new Date(b.date).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        getStore().setMedia(items as any);
      },
      'media'
    );

    // 9. Media Playlists (Real-time sync)
    subscribeSnapshot(
      query(collection(db, 'media_playlists')),
      (snap) => {
        getStore().setMediaPlaylists(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'media_playlists'
    );

    // 10. Songs & Library (Real-time sync)
    subscribeSnapshot(
      query(collection(db, 'songs')),
      (snap) => {
        getStore().setSongs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'songs'
    );

    subscribeSnapshot(
      query(collection(db, 'books')),
      (snap) => {
        getStore().setBooks(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'books'
    );

    subscribeSnapshot(
      query(collection(db, 'albums')),
      (snap) => {
        getStore().setAlbums(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'albums'
    );

    subscribeSnapshot(
      query(collection(db, 'playlists')),
      (snap) => {
        getStore().setPlaylists(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
      },
      'playlists'
    );

    // 11. World Fan Associations (Real-time sync for registered world groups)
    subscribeSnapshot(
      query(collection(db, 'world_groups')),
      (snap) => {
        if (!snap.empty) {
          const groups = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          getStore().setWorldGroups(groups);
        }
      },
      'world_groups'
    );

    // ==========================================
    // TIER 2: SECONDARY HOME WIDGETS (Deferred by 2.2s)
    // Run smoothly without competing with first paint
    // ==========================================
    const tier2Timer = setTimeout(() => {
      if (!isMounted) return;

      // Fan interactive widgets (compact limits)
      subscribeSnapshot(
        query(collection(db, 'fan_posts'), orderBy('createdAt', 'desc'), limit(15)), 
        (s) => getStore().setFanPosts(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any), 
        'fan_posts'
      );

      subscribeSnapshot(
        query(collection(db, 'polls'), orderBy('createdAt', 'desc'), limit(5)), 
        (s) => getStore().setPolls(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any), 
        'polls'
      );

      subscribeSnapshot(
        query(collection(db, 'predictions'), orderBy('createdAt', 'desc'), limit(15)), 
        (s) => getStore().setPredictions(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any), 
        'predictions'
      );

      // World Fans Activities (Posts, Events, Help Requests)
      subscribeSnapshot(
        query(collection(db, 'world_posts'), orderBy('createdAt', 'desc'), limit(30)),
        (s) => {
          if (!s.empty) {
            getStore().setWorldPosts(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
          }
        },
        'world_posts'
      );

      subscribeSnapshot(
        query(collection(db, 'world_events')),
        (s) => {
          if (!s.empty) {
            getStore().setWorldEvents(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
          }
        },
        'world_events'
      );

      subscribeSnapshot(
        query(collection(db, 'world_help_requests'), orderBy('createdAt', 'desc'), limit(30)),
        (s) => {
          if (!s.empty) {
            getStore().setWorldHelpRequests(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
          }
        },
        'world_help_requests'
      );

      // Async single doc reads
      const fetchDoc = async (col: string, id: string, setter: (d: any) => void) => {
        try {
          const s = await getDoc(doc(db, col, id));
          if (isMounted && s.exists()) setter({ id: s.id, ...(s.data() as any) });
        } catch (e) {}
      };

      fetchDoc('settings', 'ai_config', (d) => getStore().setAiConfig(d));
      fetchDoc('settings', 'newsCategories', (s) => s?.list && getStore().setNewsCategories(s.list));
      fetchDoc('settings', 'newsTags', (s) => s?.tags && getStore().setNewsTags(s.tags));
      fetchDoc('settings', 'sidebar_layout', (s) => s?.items && getStore().setSidebarMenuItems(s.items));
      fetchDoc('city_info', 'alexandria', (d) => getStore().setCityInfo(d));

      // Custom pages (lightweight sample)
      getDocs(query(collection(db, 'custom_pages'), orderBy('createdAt', 'desc'), limit(15)))
        .then(snap => {
          if (isMounted) getStore().setCustomPages(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
        })
        .catch(() => {});
    }, 2200);

    // ==========================================
    // TIER 3: BACKGROUND EXTENDED SECTIONS (Deferred by 4.5s)
    // Runs when user is already happily interacting with the app
    // ==========================================
    const tier3Timer = setTimeout(async () => {
      if (!isMounted || isInitialFetchDoneRef.current) return;
      isInitialFetchDoneRef.current = true;

      const fetchCol = async (col: string, setter: (d: any) => void, q?: any) => {
        try {
          const s = await getDocs(q || query(collection(db, col), limit(50)));
          if (!isMounted) return;
          const data = s.docs.map(d => ({ id: d.id, uid: d.id, ...(d.data() as any) }));
          setter(data || []);
        } catch (e) {}
      };

      try {
        await Promise.allSettled([
          fetchCol('clubs', (d) => getStore().setClubs(d), query(collection(db, 'clubs'), limit(50))),
          fetchCol('club_members_settings', (data) => {
            const main = data?.find((d: any) => d.id === 'main');
            if (main) getStore().setClubMembersSettings(main);
          }),
          fetchCol('member_discounts', (d) => getStore().setMemberDiscounts(d), query(collection(db, 'member_discounts'), limit(50))),
          fetchCol('club_announcements', (d) => getStore().setClubAnnouncements(d), query(collection(db, 'club_announcements'), limit(50))),
          fetchCol('club_services', (d) => getStore().setClubServices(d), query(collection(db, 'club_services'), limit(50))),
          fetchCol('club_trips', (d) => getStore().setClubTrips(d), query(collection(db, 'club_trips'), limit(50))),
          fetchCol('club_committees', (d) => getStore().setClubCommittees(d), query(collection(db, 'club_committees'), limit(50))),
          fetchCol('businesses', (d) => getStore().setBusinesses(d), query(collection(db, 'businesses'), limit(50))),
          fetchCol('world_countries', (d) => getStore().setWorldCountries(d), query(collection(db, 'world_countries'), limit(50))),
          fetchCol('world_groups', (d) => {
            if (Array.isArray(d) && d.length > 0) getStore().setWorldGroups(d);
          }, query(collection(db, 'world_groups'), limit(50))),
          fetchCol('public_services', (d) => getStore().setServices(d), query(collection(db, 'public_services'), limit(50))),
          fetchCol('club_stats', (d) => getStore().setClubStats(d), query(collection(db, 'club_stats'), limit(20))),
          fetchCol('club_titles', (d) => getStore().setClubTitles(d), query(collection(db, 'club_titles'), limit(50))),
          fetchCol('club_timeline', (d) => getStore().setHistoryEvents(d), query(collection(db, 'club_timeline'), limit(50))),
          fetchCol('club_stadiums', (d) => getStore().setStadiums(d), query(collection(db, 'club_stadiums'), limit(20))),
        ]);
      } catch (e) {}
    }, 4500);

    return () => {
      isMounted = false;
      clearTimeout(fastUnlockTimer);
      clearTimeout(tier2Timer);
      clearTimeout(tier3Timer);
      unsubs.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
    };
  }, []);

  // 2. User-specific Data Effect - Auth State Managed
  useEffect(() => {
    let userUnsubs: (() => void)[] = [];
    let currentSubscribedUid: string | null = null;
    const getStore = () => useAppStore.getState();

    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      const newUid = currentUser ? currentUser.uid : null;
      if (newUid === currentSubscribedUid) return;
      currentSubscribedUid = newUid;

      // Clean up previous user listeners
      userUnsubs.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
      userUnsubs = [];

      if (!currentUser) {
        getStore().setOrders([]);
        return;
      }

      // User Profile listener
      try {
        const unsubProfile = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as any;
              getStore().updateProfile({ ...userData, uid: currentUser.uid });
            }
          },
          (err) => {
            if (err?.code !== 'permission-denied') {
              handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            }
          }
        );
        userUnsubs.push(unsubProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      }

      // Orders listener (limited to user's orders)
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const unsubOrders = onSnapshot(
          ordersQuery,
          (s) => {
            getStore().setOrders(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
          },
          (err) => {
            if (err?.code !== 'permission-denied') {
              handleFirestoreError(err, OperationType.LIST, 'orders');
            }
          }
        );
        userUnsubs.push(unsubOrders);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }

      // Activity timestamp update (strictly throttled to once every 2 hours)
      const lastUpdateKey = `last_active_update_${currentUser.uid}`;
      try {
        const lastUpdate = typeof window !== 'undefined' ? localStorage.getItem(lastUpdateKey) : null;
        const now = Date.now();
        if (!lastUpdate || now - parseInt(lastUpdate, 10) > 7200000) {
          updateDoc(doc(db, 'users', currentUser.uid), { lastActive: new Date().toISOString() })
            .then(() => {
              try {
                if (typeof window !== 'undefined') localStorage.setItem(lastUpdateKey, now.toString());
              } catch (e) {}
            })
            .catch(() => {});
        }
      } catch (e) {}
    });

    return () => {
      unsubAuth();
      userUnsubs.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
      userUnsubs = [];
    };
  }, []);
}
