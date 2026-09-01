/** Named guest who does not have the app. Hosts book stays against this row. */
export interface GuestProfile {
  id: string;
  estateId: string;
  createdBy: string;
  name: string;
  calendarColor?: string;
  createdAt: string;
}
