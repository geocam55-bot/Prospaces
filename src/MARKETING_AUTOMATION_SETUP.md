# Marketing Automation Setup Guide

## Overview
This guide will help you set up the Marketing Automation module with full backend integration using Supabase.

## Database Setup

### Step 1: Run the Migration
Execute the marketing automation migration file to create all necessary tables:

```sql
-- Run this in your Supabase SQL Editor:
-- File: /supabase/migrations/20241116000002_marketing_automation.sql
```

This creates the following tables:
- `marketing_campaigns` - Store email, SMS, and multi-channel campaigns
- `lead_scoring_rules` - Define scoring rules based on user behavior
- `lead_scores` - Track lead scores and status
- `customer_journeys` - Automated workflows and drip campaigns
- `journey_enrollments` - Track contacts in active journeys
- `landing_pages` - Landing page builder data
- `marketing_events` - Analytics and event tracking

### Step 2: Verify Tables
After running the migration, verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'marketing%' 
OR table_name IN ('lead_scoring_rules', 'lead_scores', 'customer_journeys', 'journey_enrollments', 'landing_pages');
```

## Features

### 1. Campaign Manager
Create and manage omnichannel marketing campaigns:
- **Email Campaigns** - Rich email campaigns with personalization
- **SMS Campaigns** - Quick SMS alerts and promotions
- **Social Media** - Facebook and Instagram campaign coordination
- **Multi-channel** - Coordinated campaigns across all channels

**Key Features:**
- Campaign scheduling (immediate, scheduled, or AI-optimized)
- A/B testing configuration
- Audience segmentation
- Real-time analytics (opens, clicks, conversions, revenue)
- Campaign duplication and templates

### 2. Lead Scoring
Automatically score and prioritize leads based on behavior:
- **Scoring Rules** - Define points for actions (email opens, clicks, form submissions, etc.)
- **Lead Segments** - Automatically categorize leads as Hot (80+), Warm (50-79), or Cold (1-49)
- **Score History** - Track how leads move through scoring tiers
- **AI Insights** - Get recommendations for scoring optimization

**Default Scoring Actions:**
- Email Opened: +5 points
- Link Clicked: +10 points
- Form Submitted: +25 points
- Downloaded Resource: +15 points
- Visited Pricing Page: +20 points
- Requested Demo: +50 points
- Inactive for 30 days: -10 points
- Unsubscribed: -50 points

### 3. Journey Builder
Create automated customer journeys based on triggers:
- **Visual Builder** - Drag-and-drop journey creation
- **Trigger Types** - Form submission, tag added, page visit, purchase, etc.
- **Actions** - Send email/SMS, add tags, update score, create tasks
- **Control Flow** - Wait/delays, if/then branches, A/B splits, loops
- **Real-time Tracking** - Monitor enrollments, completions, drop-offs

**Example Journeys:**
- Welcome Series (5 steps, 7 days)
- Abandoned Cart Recovery (3 steps, 24 hours)
- Re-engagement Campaign (4 steps, 14 days)
- Product Education Series (6 steps, 10 days)

### 4. Landing Page Builder
Create high-converting landing pages:
- **Drag-and-Drop Builder** - Easy page creation
- **Templates** - Pre-built templates for common use cases
- **SEO Optimization** - Meta descriptions, title tags
- **Conversion Tracking** - Track views and conversions
- **A/B Testing** - Test variations for optimization

**Available Templates:**
- Lead Capture
- Product Launch
- Webinar Registration
- eBook Download
- Free Trial Signup
- Coming Soon Page

### 5. Marketing Analytics
Comprehensive analytics and attribution:
- **Overview** - Key metrics (revenue, ROI, conversion rate, cost per lead)
- **Channel Performance** - Compare email, SMS, social media
- **Attribution** - Track revenue by campaign
- **Funnel Analysis** - Identify drop-off points in customer journey
- **Content Performance** - See which content drives conversions

## API Reference

### Campaign Functions

```typescript
import { 
  getCampaigns, 
  createCampaign, 
  updateCampaign, 
  deleteCampaign,
  duplicateCampaign 
} from './utils/marketing-client';

// Get all campaigns
const campaigns = await getCampaigns(organizationId);

// Create campaign
const newCampaign = await createCampaign({
  name: 'Summer Sale',
  type: 'email',
  channel: 'email',
  status: 'draft',
  subject_line: 'Amazing Summer Deals!',
  content: 'Check out our latest offers...'
}, organizationId);

// Update campaign
await updateCampaign(campaignId, { status: 'active' });

// Duplicate campaign
await duplicateCampaign(campaignId, organizationId);
```

### Lead Scoring Functions

```typescript
import { 
  getScoringRules, 
  createScoringRule,
  getLeadScores,
  updateLeadScore 
} from './utils/marketing-client';

// Get scoring rules
const rules = await getScoringRules(organizationId);

// Create scoring rule
const rule = await createScoringRule({
  action: 'Email Opened',
  category: 'engagement',
  points: 5
}, organizationId);

// Update lead score when action occurs
await updateLeadScore(contactId, organizationId, 10, 'Clicked pricing page');
```

### Journey Functions

```typescript
import { 
  getJourneys, 
  createJourney, 
  updateJourney 
} from './utils/marketing-client';

// Get all journeys
const journeys = await getJourneys(organizationId);

// Create journey
const journey = await createJourney({
  name: 'Welcome Series',
  status: 'draft',
  trigger_type: 'form_submitted',
  steps: [
    { type: 'email', delay: 0, template: 'welcome' },
    { type: 'wait', delay: 86400 }, // 1 day
    { type: 'email', delay: 0, template: 'feature_intro' }
  ]
}, organizationId);
```

## Data Isolation

All marketing tables use Row Level Security (RLS) to ensure multi-tenant data isolation:
- Users can only access campaigns, scores, and journeys from their organization
- Automatic `organization_id` filtering on all queries
- Secure by default - no cross-organization data leakage

## Integration Points

### With Contacts Module
- Lead scoring automatically syncs with contacts
- Journey enrollments based on contact actions
- Contact segments for campaign targeting

### With Email Module
- Send campaigns through integrated email service
- Track opens and clicks automatically
- Sync email activities to lead scores

### With Analytics
- Revenue attribution by campaign
- Conversion tracking across touchpoints
- ROI calculations

## Best Practices

1. **Start with Lead Scoring**
   - Define your scoring rules first
   - Monitor for 2-4 weeks before using for segmentation
   - Adjust weights based on actual conversion data

2. **Test Campaigns**
   - Always start with small test segments
   - Use A/B testing for subject lines and content
   - Monitor unsubscribe rates

3. **Journey Optimization**
   - Keep journeys simple initially (3-5 steps)
   - Monitor drop-off points
   - Add delays between steps (avoid overwhelming contacts)

4. **Landing Pages**
   - Use templates as starting points
   - Keep forms short (3-5 fields max)
   - Add clear calls-to-action
   - Test variations regularly

5. **Analytics Review**
   - Check metrics weekly
   - Focus on conversion rate over volume
   - Track ROI by channel
   - Use insights to optimize campaigns

## Troubleshooting

### Campaigns not sending
- Check campaign status is 'active'
- Verify email integration is configured
- Ensure audience_count > 0

### Lead scores not updating
- Verify scoring rules are is_active = true
- Check that events are being tracked
- Ensure contact exists in contacts table

### Journeys not triggering
- Confirm journey status is 'active'
- Check trigger configuration
- Verify contacts meet trigger criteria

## Next Steps

1. Run the migration to create tables
2. Set up default lead scoring rules
3. Create your first email campaign
4. Build a welcome journey for new contacts
5. Review analytics weekly to optimize performance

## Support

For issues or questions:
- Check the Supabase logs for errors
- Verify RLS policies are active
- Ensure user has proper organization_id in profiles table
