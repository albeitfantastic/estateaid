export interface Estate {
  id: string;
  ownerId: string;
  /** User whose trial/Pro covers host capabilities on this estate. */
  sponsorUserId: string;
  name: string;
  location: string;
  coverImageUrl?: string;
  description?: string;
  timeZone: string;
  createdAt: string;
}
