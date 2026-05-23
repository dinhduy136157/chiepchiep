import type { SupabaseClient, User } from "@supabase/supabase-js"

export type StudySet = {
  id: string
  title: string
  description: string | null
  created_at?: string
}

export type Card = {
  id: number
  term: string
  definition: string
}

export type CardWithSetId = Card & {
  set_id: string
}

export type LearningStatus = "learning" | "mastered"

export type Group = {
  id: string
  name: string
  description: string | null
  role?: string | null
}

export type Profile = {
  id: string
  username: string | null
  avatar_url?: string | null
}

export type GroupMember = {
  user_id: string
  role: string
  profiles?: {
    username?: string | null
    avatar_url?: string | null
  } | null
}

export type SharedSetCard = {
  id: number
  learning_progress?: { user_id: string; status: string }[] | null
}

export type SharedSet = StudySet & {
  cards?: SharedSetCard[]
}

export type UserStreak = {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
}

type UserStreakRow = {
  CurrentStreak: number
  LongestStreak: number
  LastActivityDate: string | null
}

export async function getCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function requireCurrentUser(supabase: SupabaseClient): Promise<User> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error("AUTH_REQUIRED")
  return user
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDayDifference(from: Date, to: Date) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / msPerDay)
}

export async function recordDailyStreak(supabase: SupabaseClient, userId: string): Promise<UserStreak> {
  const now = new Date()
  const nowIso = now.toISOString()
  const { data: streakRow, error: streakError } = await supabase
    .from("UserStreaks")
    .select("CurrentStreak, LongestStreak, LastActivityDate")
    .eq("UserId", userId)
    .maybeSingle<UserStreakRow>()

  if (streakError) throw streakError

  if (!streakRow) {
    const initialStreak: UserStreak = {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: nowIso,
    }
    const { error } = await supabase.from("UserStreaks").insert({
      UserId: userId,
      CurrentStreak: initialStreak.currentStreak,
      LongestStreak: initialStreak.longestStreak,
      LastActivityDate: initialStreak.lastActivityDate,
      UpdatedAt: nowIso,
    })
    if (error) throw error
    return initialStreak
  }

  let nextCurrent = streakRow.CurrentStreak ?? 0
  let nextLongest = streakRow.LongestStreak ?? 0
  const lastActivityDate = streakRow.LastActivityDate
  const lastActivity = lastActivityDate ? new Date(lastActivityDate) : null
  const dayDiff = lastActivity ? getDayDifference(lastActivity, now) : 999
  let shouldUpdate = false

  if (!lastActivity || dayDiff > 1) {
    nextCurrent = 1
    shouldUpdate = true
  } else if (dayDiff === 1) {
    nextCurrent = (streakRow.CurrentStreak ?? 0) + 1
    shouldUpdate = true
  }

  nextLongest = Math.max(nextLongest, nextCurrent)

  if (shouldUpdate) {
    const { error } = await supabase
      .from("UserStreaks")
      .update({
        CurrentStreak: nextCurrent,
        LongestStreak: nextLongest,
        LastActivityDate: nowIso,
        UpdatedAt: nowIso,
      })
      .eq("UserId", userId)
    if (error) throw error
  }

  return {
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastActivityDate: shouldUpdate ? nowIso : lastActivityDate,
  }
}

export async function loadProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .maybeSingle<{ username: string | null; avatar_url: string | null }>()
  if (error) throw error
  return data
}

export async function loadUserStudySets(supabase: SupabaseClient, userId: string): Promise<StudySet[]> {
  const { data, error } = await supabase
    .from("study_sets")
    .select("id, title, description, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as StudySet[]
}

export async function loadCardCountsBySet(supabase: SupabaseClient, setIds: string[]) {
  if (setIds.length === 0) return {}
  const { data, error } = await supabase.from("cards").select("set_id").in("set_id", setIds)
  if (error) throw error
  return ((data ?? []) as { set_id: string }[]).reduce<Record<string, number>>((counts, row) => {
    counts[row.set_id] = (counts[row.set_id] ?? 0) + 1
    return counts
  }, {})
}

export async function loadSetDetail(supabase: SupabaseClient, setId: string, userId: string) {
  const [
    { data: setRow, error: setRowError },
    { data: cardRows, error: cardRowsError },
    { data: progressRows, error: progressError },
  ] = await Promise.all([
    supabase.from("study_sets").select("title, description").eq("id", setId).single(),
    supabase.from("cards").select("id, term, definition, set_id").eq("set_id", setId).order("id", { ascending: true }),
    supabase.from("learning_progress").select("card_id").eq("user_id", userId).eq("status", "mastered"),
  ])

  if (setRowError) throw setRowError
  if (cardRowsError) throw cardRowsError
  if (progressError) throw progressError

  const cards = (cardRows ?? []) as CardWithSetId[]
  const cardIds = new Set(cards.map((card) => card.id))
  const masteredIds = new Set(
    ((progressRows ?? []) as { card_id: number }[])
      .map((row) => row.card_id)
      .filter((cardId) => cardIds.has(cardId))
  )

  return {
    title: setRow?.title ?? "",
    description: setRow?.description ?? "",
    cards,
    masteredIds,
  }
}

export async function addCardToSet(
  supabase: SupabaseClient,
  setId: string,
  term: string,
  definition: string
) {
  const { data, error } = await supabase
    .from("cards")
    .insert([{ set_id: setId, term: term.trim(), definition: definition.trim() }])
    .select("id, term, definition, set_id")
  if (error) throw error
  return (data ?? []) as CardWithSetId[]
}

export async function bulkImportCards(
  supabase: SupabaseClient,
  rows: { set_id: string; term: string; definition: string }[]
) {
  if (rows.length === 0) return []
  const { data, error } = await supabase.from("cards").insert(rows).select("id, term, definition, set_id")
  if (error) throw error
  return (data ?? []) as CardWithSetId[]
}

export async function deleteCard(supabase: SupabaseClient, cardId: number) {
  const { error } = await supabase.from("cards").delete().eq("id", cardId)
  if (error) throw error
}

export async function setLearningProgress(
  supabase: SupabaseClient,
  userId: string,
  cardId: number,
  status: LearningStatus
) {
  const { error } = await supabase.from("learning_progress").upsert(
    {
      user_id: userId,
      card_id: cardId,
      status,
      last_reviewed: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" }
  )
  if (error) throw error
}

export async function createStudySetWithCards(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string
    description: string
    cards: { term: string; definition: string }[]
  }
) {
  const { data: setData, error: createSetError } = await supabase
    .from("study_sets")
    .insert([
      {
        title: input.title.trim(),
        description: input.description.trim(),
        author_id: userId,
      },
    ])
    .select("id")
    .single<{ id: string }>()

  if (createSetError || !setData) throw createSetError ?? new Error("Không thể tạo học phần.")

  const cardsToInsert = input.cards.map((card) => ({
    term: card.term.trim(),
    definition: card.definition.trim(),
    set_id: setData.id,
  }))
  const { error: cardError } = await supabase.from("cards").insert(cardsToInsert)
  if (cardError) throw cardError

  return setData.id
}

export async function deleteStudySet(supabase: SupabaseClient, setId: string) {
  const { error } = await supabase.from("study_sets").delete().eq("id", setId)
  if (error) throw error
}

export async function loadUserGroups(supabase: SupabaseClient, userId: string): Promise<Group[]> {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId)
  if (membershipError) throw membershipError

  const groupIds = (membershipRows ?? []).map((row) => row.group_id)
  if (groupIds.length === 0) return []

  const { data: groupRows, error: groupError } = await supabase
    .from("groups")
    .select("id, name, description")
    .in("id", groupIds)
  if (groupError) throw groupError

  const roleById = new Map((membershipRows ?? []).map((row) => [row.group_id, row.role]))
  return (groupRows ?? []).map((group) => ({
    ...group,
    role: roleById.get(group.id) ?? null,
  }))
}

export async function searchProfiles(supabase: SupabaseClient, query: string, limit = 20): Promise<Profile[]> {
  let request = supabase.from("profiles").select("id, username, avatar_url").order("username", { ascending: true }).limit(limit)
  const normalized = query.trim()
  if (normalized) {
    request = request.ilike("username", `%${normalized}%`)
  }
  const { data, error } = await request
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function createGroupWithMembers(
  supabase: SupabaseClient,
  input: {
    ownerId: string
    name: string
    description: string
    memberIds: string[]
  }
) {
  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .insert([{ name: input.name.trim(), description: input.description.trim(), created_by: input.ownerId }])
    .select("id, name, description")
    .single<Group>()
  if (groupError || !groupData) throw groupError ?? new Error("Không thể tạo nhóm.")

  const memberRows = [
    { group_id: groupData.id, user_id: input.ownerId, role: "owner" },
    ...input.memberIds
      .filter((uid) => uid !== input.ownerId)
      .map((uid) => ({ group_id: groupData.id, user_id: uid, role: "member" })),
  ]
  const { error: memberError } = await supabase.from("group_members").insert(memberRows)
  if (memberError) throw memberError

  return { ...groupData, role: "owner" }
}

type SharedSetRelationRow = {
  study_sets: SharedSet | SharedSet[] | null
}

export async function loadGroupDetail(supabase: SupabaseClient, groupId: string, userId: string) {
  const [
    { data: groupData, error: groupError },
    { data: memberRows, error: memberError },
    { data: mySetRows, error: mySetError },
    { data: sharedRows, error: sharedError },
  ] = await Promise.all([
    supabase.from("groups").select("id, name, description").eq("id", groupId).single<Group>(),
    supabase
      .from("group_members")
      .select("user_id, role, profiles:user_id ( username, avatar_url )")
      .eq("group_id", groupId),
    supabase.from("study_sets").select("id, title, description").eq("author_id", userId),
    supabase
      .from("group_study_sets")
      .select("study_sets ( id, title, description, cards ( id, learning_progress ( user_id, status ) ) )")
      .eq("group_id", groupId),
  ])

  if (groupError) throw groupError
  if (memberError) throw memberError
  if (mySetError) throw mySetError
  if (sharedError) throw sharedError

  const members: GroupMember[] = (memberRows ?? []).map((member) => {
    const profileValue = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    return {
      user_id: member.user_id,
      role: member.role,
      profiles: profileValue ?? null,
    }
  })

  const sharedSets: SharedSet[] = ((sharedRows ?? []) as SharedSetRelationRow[]).flatMap((item) => {
    if (!item.study_sets) return []
    return Array.isArray(item.study_sets) ? item.study_sets : [item.study_sets]
  })

  return {
    group: groupData ?? null,
    members,
    mySets: (mySetRows ?? []) as StudySet[],
    sharedSets,
  }
}

export async function shareSetToGroup(supabase: SupabaseClient, groupId: string, setId: string) {
  const { error } = await supabase.from("group_study_sets").insert([{ group_id: groupId, set_id: setId }])
  if (error) throw error
}
