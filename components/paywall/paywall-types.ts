export type Plan = {
  id: 'monthly' | 'yearly';
  title: string;
  priceLabel: string;
  helper?: string;
  badge?: string;
};

export type Testimonial = {
  quote: string;
};

export type Benefit = {
  label: string;
};

export type TimelineItem = {
  heading: string;
  body: string;
};

export type Reassurance = {
  label: string;
};
