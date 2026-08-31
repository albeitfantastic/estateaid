/** Max owner-role holders per property including the sponsor (§3). */
export const OWNER_CAP = 4;

/** Invited owners in addition to sponsor (OWNER_CAP - 1). */
export const OWNER_INVITE_CAP = OWNER_CAP - 1;

/** @deprecated Use OWNER_INVITE_CAP / OWNER_CAP. */
export const CO_OWNER_CAP = OWNER_INVITE_CAP;
