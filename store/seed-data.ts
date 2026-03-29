import { useAuthStore } from './auth-store';
import { useEstateStore } from './estate-store';
import { useInvitationStore } from './invitation-store';
import { useStayStore } from './stay-store';
import { useFaqStore } from './faq-store';
import { useDocumentStore } from './document-store';
import { useContactStore } from './contact-store';
import { useTicketStore } from './ticket-store';
import { useEventStore } from './event-store';
import { User, Estate, Invitation, StayRequest, Stay, FaqItem, EstateDocument, EstateContact, Ticket, EstateEvent } from '@/types';

// ── Users ────────────────────────────────────────────────────────────────────
export const SEED_USERS: User[] = [
  {
    id: 'owner-1',
    name: 'Alexander von Berg',
    email: 'alexander@estateaid.app',
    role: 'owner',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'owner-2',
    name: 'Sophie Hartmann',
    email: 'sophie@estateaid.app',
    role: 'owner',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'guest-1',
    name: 'Marco Rossi',
    email: 'marco@example.com',
    role: 'guest',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'guest-2',
    name: 'Claire Dubois',
    email: 'claire@example.com',
    role: 'guest',
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'guest-3',
    name: 'Tomás García',
    email: 'tomas@example.com',
    role: 'guest',
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'guest-4',
    name: 'Lena Müller',
    email: 'lena@example.com',
    role: 'guest',
    createdAt: '2024-02-15T00:00:00Z',
  },
];

// ── Estates ──────────────────────────────────────────────────────────────────
const ESTATES: Estate[] = [
  {
    id: 'estate-1',
    ownerId: 'owner-1',
    name: 'Villa Serena',
    location: 'Tuscany, Italy',
    coverImageUrl: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800&auto=format&fit=crop',
    description: 'A stunning 16th-century villa nestled in the rolling hills of Chianti, with a private pool, olive grove, and vineyard. Sleeps 10.',
    timeZone: 'Europe/Rome',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'estate-2',
    ownerId: 'owner-1',
    name: 'Chalet Blanc',
    location: 'Verbier, Switzerland',
    coverImageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop',
    description: 'A luxury ski chalet with direct piste access, hot tub, and mountain views. Sleeps 8.',
    timeZone: 'Europe/Zurich',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'estate-3',
    ownerId: 'owner-2',
    name: 'Casa Azul',
    location: 'Algarve, Portugal',
    coverImageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&auto=format&fit=crop',
    description: 'A modern clifftop villa overlooking the Atlantic, with an infinity pool and private beach access. Sleeps 6.',
    timeZone: 'Europe/Lisbon',
    createdAt: '2024-01-20T00:00:00Z',
  },
];

// ── Invitations ───────────────────────────────────────────────────────────────
const INVITATIONS: Invitation[] = [
  {
    id: 'inv-1',
    estateId: 'estate-1',
    ownerId: 'owner-1',
    inviteCode: 'SERENA4M',
    guestEmail: 'marco@example.com',
    guestId: 'guest-1',
    status: 'accepted',
    message: 'Marco, you are always welcome at Villa Serena!',
    createdAt: '2024-03-01T00:00:00Z',
    respondedAt: '2024-03-02T00:00:00Z',
  },
  {
    id: 'inv-2',
    estateId: 'estate-1',
    ownerId: 'owner-1',
    inviteCode: 'SERENA7C',
    guestEmail: 'claire@example.com',
    guestId: 'guest-2',
    status: 'accepted',
    message: 'Claire, hope you enjoy Tuscany!',
    createdAt: '2024-03-05T00:00:00Z',
    respondedAt: '2024-03-06T00:00:00Z',
  },
  {
    id: 'inv-3',
    estateId: 'estate-2',
    ownerId: 'owner-1',
    inviteCode: 'CHALET3M',
    guestEmail: 'marco@example.com',
    guestId: 'guest-1',
    status: 'accepted',
    createdAt: '2024-03-10T00:00:00Z',
    respondedAt: '2024-03-11T00:00:00Z',
  },
  {
    id: 'inv-4',
    estateId: 'estate-1',
    ownerId: 'owner-1',
    inviteCode: 'SERENA9T',
    guestEmail: 'tomas@example.com',
    status: 'pending',
    message: 'Tomás, we would love to have you over this summer.',
    createdAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 'inv-5',
    estateId: 'estate-2',
    ownerId: 'owner-1',
    inviteCode: 'CHALET5L',
    guestEmail: 'lena@example.com',
    status: 'pending',
    message: 'Lena, the ski season is looking great — hope you can join!',
    createdAt: '2026-03-22T00:00:00Z',
  },
];

// ── Stay requests & stays ─────────────────────────────────────────────────────
const STAY_REQUESTS: StayRequest[] = [
  {
    id: 'req-1',
    estateId: 'estate-1',
    guestId: 'guest-1',
    requestedFrom: '2026-06-10',
    requestedTo: '2026-06-20',
    status: 'approved',
    guestNote: 'Looking forward to the olive harvest season!',
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-06T00:00:00Z',
  },
  {
    id: 'req-2',
    estateId: 'estate-1',
    guestId: 'guest-2',
    requestedFrom: '2026-07-01',
    requestedTo: '2026-07-10',
    status: 'pending',
    guestNote: 'Would love to bring my family for a summer holiday.',
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'req-3',
    estateId: 'estate-1',
    guestId: 'guest-1',
    requestedFrom: '2026-06-18',
    requestedTo: '2026-06-25',
    status: 'pending',
    guestNote: 'Hoping for a second trip!',
    createdAt: '2026-03-16T00:00:00Z',
    updatedAt: '2026-03-16T00:00:00Z',
  },
  {
    id: 'req-4',
    estateId: 'estate-2',
    guestId: 'guest-1',
    requestedFrom: '2026-12-20',
    requestedTo: '2026-12-28',
    status: 'alternative_proposed',
    guestNote: 'Christmas week would be perfect!',
    ownerNote: 'The chalet is already reserved for the 20–23rd. How about 24–28?',
    alternativeFrom: '2026-12-24',
    alternativeTo: '2026-12-28',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  },
];

const STAYS: Stay[] = [
  {
    id: 'stay-1',
    stayRequestId: 'req-1',
    estateId: 'estate-1',
    guestId: 'guest-1',
    from: '2026-06-10',
    to: '2026-06-20',
  },
];

// ── FAQs ─────────────────────────────────────────────────────────────────────
const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    estateId: 'estate-1',
    question: 'How do I start the pool pump?',
    answer: 'The pool pump is located in the stone utility shed to the left of the pool. Open the blue breaker box and flip the switch labeled "POMPA". The pump runs automatically on a timer but can be started manually. Let it run at least 6 hours per day.',
    order: 0,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'faq-2',
    estateId: 'estate-1',
    question: 'Where is the WiFi password?',
    answer: 'The router is in the study on the ground floor. WiFi: VillaSerena_Guest | Password: Chianti2024!  There is also a laminated card with the password inside the kitchen drawer next to the coffee machine.',
    order: 1,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'faq-3',
    estateId: 'estate-1',
    question: 'How does the wood-burning fireplace work?',
    answer: 'Open the flue damper fully before lighting (lever on the left side of the firebox, pull forward). Use the firelighters and kindling in the basket next to the fireplace. Firewood is stacked on the north terrace. Always ensure the damper is fully open before lighting to prevent smoke indoors.',
    order: 2,
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'faq-4',
    estateId: 'estate-1',
    question: 'Is there a wine cellar?',
    answer: 'Yes! The cellar is accessed via the wooden door at the bottom of the main staircase. The key is on the hook in the kitchen labeled "Cantina". Please feel free to enjoy any bottles on the lower two shelves — those are set aside for guests.',
    order: 3,
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'faq-5',
    estateId: 'estate-2',
    question: 'How do I activate the hot tub?',
    answer: 'The hot tub panel is on the right side. Press the jets button (wave icon) to start. Set temperature using the + / - buttons. It takes about 45 minutes to heat from cold. Turn it off when not in use — the cover should always be replaced to retain heat.',
    order: 0,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'faq-6',
    estateId: 'estate-2',
    question: 'Where are the ski lockers?',
    answer: 'Ski lockers are in the boot room on the ground floor, accessible from the side entrance. Lockers are numbered 1–8 and a key is in the drawer below each locker. Boot warmers are built in — plug them in overnight.',
    order: 1,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

// ── Documents ─────────────────────────────────────────────────────────────────
const DOCUMENTS: EstateDocument[] = [
  {
    id: 'doc-1',
    estateId: 'estate-1',
    title: 'Pool Maintenance Manual',
    description: 'Complete guide for pool chemical balance, pump operation, and seasonal shutdown.',
    fileUri: 'assets/docs/pool-manual.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 512000,
    category: 'manual',
    uploadedBy: 'owner-1',
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'doc-2',
    estateId: 'estate-1',
    title: 'House Rules',
    description: 'Rules and guidelines for staying at Villa Serena.',
    fileUri: 'assets/docs/house-rules.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 128000,
    category: 'rule',
    uploadedBy: 'owner-1',
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'doc-3',
    estateId: 'estate-1',
    title: 'Emergency Procedures',
    description: 'What to do in case of fire, flooding, or medical emergency.',
    fileUri: 'assets/docs/emergency.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 256000,
    category: 'emergency',
    uploadedBy: 'owner-1',
    createdAt: '2024-01-22T00:00:00Z',
  },
  {
    id: 'doc-4',
    estateId: 'estate-2',
    title: 'Chalet Blanc Welcome Guide',
    description: 'Everything you need to know about Chalet Blanc — from arrival to departure.',
    fileUri: 'assets/docs/chalet-guide.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 820000,
    category: 'guide',
    uploadedBy: 'owner-1',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// ── Contacts ──────────────────────────────────────────────────────────────────
const CONTACTS: EstateContact[] = [
  {
    id: 'contact-1',
    estateId: 'estate-1',
    name: 'Giovanni Ferraro',
    role: 'Caretaker',
    phone: '+39 055 123 4567',
    category: 'staff',
    notes: 'Lives 2 km away in the village. Available 7 days a week.',
    order: 0,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'contact-2',
    estateId: 'estate-1',
    name: 'Roberto Plumbing',
    role: 'Plumber',
    phone: '+39 055 987 6543',
    category: 'service',
    notes: 'Use for any water/pipe issues. Ask for Roberto.',
    order: 1,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'contact-3',
    estateId: 'estate-1',
    name: 'Famiglia Conti',
    role: 'Neighbor (North)',
    phone: '+39 055 111 2222',
    category: 'neighbor',
    notes: 'Friendly neighbors. Contact in case of any disturbances or emergency access needed.',
    order: 2,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'contact-4',
    estateId: 'estate-1',
    name: 'Pronto Soccorso Siena',
    role: 'Emergency Services',
    phone: '118',
    category: 'emergency',
    order: 3,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'contact-5',
    estateId: 'estate-2',
    name: 'Hans Baumann',
    role: 'Chalet Manager',
    phone: '+41 27 123 4567',
    email: 'hans@verbiercare.ch',
    category: 'staff',
    notes: 'First point of contact for any issues at Chalet Blanc.',
    order: 0,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'contact-6',
    estateId: 'estate-2',
    name: 'Verbier Mountain Rescue',
    role: 'Emergency / Mountain Rescue',
    phone: '1414',
    category: 'emergency',
    order: 1,
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// ── Tickets ───────────────────────────────────────────────────────────────────
const TICKETS: Ticket[] = [
  {
    id: 'ticket-1',
    estateId: 'estate-1',
    guestId: 'guest-1',
    title: 'Pool heater not working',
    status: 'in_progress',
    priority: 'high',
    messages: [
      {
        id: 'msg-1',
        ticketId: 'ticket-1',
        authorId: 'guest-1',
        body: 'Hi, the pool heater does not seem to be responding. The water is very cold and the panel shows an error E3.',
        createdAt: '2026-06-12T10:00:00Z',
      },
      {
        id: 'msg-2',
        ticketId: 'ticket-1',
        authorId: 'owner-1',
        body: 'Hi Marco, sorry to hear that! Error E3 usually means the thermostat sensor needs resetting. I have called Giovanni — he will come by tomorrow morning. In the meantime you can manually heat the pool by running the pump on boost mode (hold the POMPA button for 5 seconds).',
        createdAt: '2026-06-12T14:00:00Z',
      },
    ],
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: '2026-06-12T14:00:00Z',
  },
  {
    id: 'ticket-2',
    estateId: 'estate-1',
    guestId: 'guest-1',
    title: 'WiFi drops in the east wing',
    status: 'resolved',
    priority: 'normal',
    messages: [
      {
        id: 'msg-3',
        ticketId: 'ticket-2',
        authorId: 'guest-1',
        body: 'The WiFi signal is very weak in the east wing bedrooms.',
        createdAt: '2026-06-11T09:00:00Z',
      },
      {
        id: 'msg-4',
        ticketId: 'ticket-2',
        authorId: 'owner-1',
        body: 'There is an extender in the linen cupboard on the east corridor — please plug it in to the wall socket nearest the hallway. That should fix the coverage.',
        createdAt: '2026-06-11T11:00:00Z',
      },
      {
        id: 'msg-5',
        ticketId: 'ticket-2',
        authorId: 'guest-1',
        body: 'That worked perfectly, thank you!',
        createdAt: '2026-06-11T12:00:00Z',
      },
    ],
    createdAt: '2026-06-11T09:00:00Z',
    updatedAt: '2026-06-11T12:00:00Z',
  },
];

// ── Events ────────────────────────────────────────────────────────────────────
const EVENTS: EstateEvent[] = [
  {
    id: 'event-1',
    estateId: 'estate-1',
    title: 'Glass & Recycling Pickup',
    description: 'Leave bins at the gate before 8 AM.',
    type: 'recurring',
    recurrence: { frequency: 'weekly', dayOfWeek: 1, startDate: '2024-01-01' },
    color: '#22c55e',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'event-2',
    estateId: 'estate-1',
    title: 'Garden Maintenance',
    description: 'Gardener visits every two weeks on Wednesday.',
    type: 'recurring',
    recurrence: { frequency: 'biweekly', dayOfWeek: 3, startDate: '2024-03-01' },
    color: '#8B5CF6',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'event-3',
    estateId: 'estate-1',
    title: 'Pool Winterization',
    description: 'Drain and cover the pool for winter season.',
    type: 'task',
    date: '2026-10-15',
    color: '#0a7ea4',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'event-4',
    estateId: 'estate-2',
    title: 'Chimney Sweep',
    description: 'Annual chimney inspection and cleaning.',
    type: 'task',
    date: '2026-09-01',
    color: '#f59e0b',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'event-5',
    estateId: 'estate-2',
    title: 'Trash Collection',
    description: 'Municipal pickup every Thursday morning.',
    type: 'recurring',
    recurrence: { frequency: 'weekly', dayOfWeek: 4, startDate: '2024-01-01' },
    color: '#64748B',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'event-6',
    estateId: 'estate-1',
    title: 'Olive Harvest Prep',
    description: 'Order nets and coordinate harvest crew.',
    type: 'task',
    date: '2026-09-20',
    color: '#B5703A',
    createdAt: '2026-02-01T00:00:00Z',
  },
];

// ── seedStores ────────────────────────────────────────────────────────────────
export function seedStores(): void {
  useEstateStore.getState().setEstates(ESTATES);
  useInvitationStore.getState().setInvitations(INVITATIONS);
  useStayStore.getState().setStayRequests(STAY_REQUESTS);
  useStayStore.getState().setStays(STAYS);
  useFaqStore.getState().setFaqs(FAQS);
  useDocumentStore.getState().setDocuments(DOCUMENTS);
  useContactStore.getState().setContacts(CONTACTS);
  useTicketStore.getState().setTickets(TICKETS);
  useEventStore.getState().setEvents(EVENTS);
}

