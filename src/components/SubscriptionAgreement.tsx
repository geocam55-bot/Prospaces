import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Calendar, Download, Printer, FileText, ArrowLeft, Save, Edit2, Check, X } from 'lucide-react';
import { Logo } from './Logo';
import { subscriptionAgreementAPI, settingsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import type { Organization } from '../App';

interface Module {
  id: string;
  name: string;
  description: string;
  price?: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price?: number;
}

interface SubscriptionAgreementProps {
  organization?: Organization | null;
  onBack?: () => void;
}

const AGREEMENT_TERMS = [
  {
    title: '1. Service Description',
    body: 'ProSpaces CRM agrees to provide the Client with access to a cloud-based Customer Relationship Management platform, including the modules and services selected below. The software is provided as a subscription service (SaaS) hosted on secure servers.',
  },
  {
    title: '2. Subscription Term',
    body: 'This agreement shall commence on the Start Date specified below and continue for the Duration period selected. The subscription will automatically renew for successive periods of equal length unless either party provides written notice of non-renewal at least 30 days prior to the end of the current term.',
  },
  {
    title: '3. Fees and Payment',
    body: 'The Client agrees to pay the fees specified in the Pricing section below. Monthly recurring fees are due on the first day of each month. One-time fees (setup, onboarding, etc.) are due within 15 days of invoice. All fees are non-refundable except as required by law.',
  },
  {
    title: '4. Data Security and Privacy',
    body: 'ProSpaces CRM employs industry-standard security measures to protect Client data. All data is encrypted in transit and at rest. Client retains ownership of all data entered into the system. ProSpaces CRM will not share, sell, or disclose Client data to third parties without explicit consent, except as required by law.',
  },
  {
    title: '5. Support and Maintenance',
    body: 'Standard support includes email support during business hours (9 AM - 5 PM EST, Monday-Friday) with response within 24 business hours. The system includes regular updates, security patches, and feature enhancements at no additional cost.',
  },
  {
    title: '6. User Licenses',
    body: 'Pricing includes user licenses as specified. Additional users may be added at the then-current rate. The Client is responsible for maintaining the security of user credentials and for all activities under user accounts.',
  },
  {
    title: '7. Service Level Agreement (SLA)',
    body: 'ProSpaces CRM guarantees 99.5% uptime on an annual basis, excluding scheduled maintenance windows. Scheduled maintenance will be announced at least 48 hours in advance.',
  },
  {
    title: '8. Data Rights and Ownership',
    body: 'The Client retains full ownership and all rights to their data at all times, including after subscription cancellation or termination. Upon request after termination, ProSpaces CRM will provide the Client with a complete export of all data in standard formats (CSV, JSON, or PDF) within 30 days. Client data will be securely stored for 90 days following termination to allow for data retrieval. After 90 days, unless otherwise agreed in writing, all Client data will be permanently deleted from ProSpaces CRM servers. The Client may request early deletion of their data at any time.',
  },
  {
    title: '9. Termination',
    body: 'Either party may terminate this agreement with 30 days written notice. Upon termination, Client will have 30 days to export all data from the system. ProSpaces CRM may suspend service immediately for non-payment or violation of terms. All data export and retention rights specified in Section 8 (Data Rights and Ownership) remain in effect after termination.',
  },
  {
    title: '10. Limitation of Liability',
    body: "ProSpaces CRM's total liability under this agreement shall not exceed the total fees paid by Client in the 12 months preceding the claim. ProSpaces CRM is not liable for indirect, incidental, or consequential damages.",
  },
  {
    title: '11. Modifications',
    body: 'ProSpaces CRM may modify these terms with 30 days notice. Continued use of the service after notification constitutes acceptance of modified terms.',
  },
];

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrencyValue(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDisplayDate(value: string) {
  if (!value) return 'Not specified';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';

  return date.toLocaleDateString();
}

function getAgreementEndDate(startDate: string, durationMonths: string) {
  if (!startDate) return 'Not specified';

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return 'Not specified';

  const months = parseInt(durationMonths, 10);
  date.setMonth(date.getMonth() + (Number.isNaN(months) ? 0 : months));
  return date.toLocaleDateString();
}

function getDurationLabel(durationMonths: string) {
  const months = parseInt(durationMonths, 10);

  if (Number.isNaN(months) || months <= 0) {
    return 'Not specified';
  }

  if (months === 1) {
    return '1 Month';
  }

  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} Year${years === 1 ? '' : 's'}`;
  }

  return `${months} Months`;
}

export function SubscriptionAgreement({ organization, onBack }: SubscriptionAgreementProps) {
  const [agreementData, setAgreementData] = useState({
    clientName: '',
    clientCompany: '',
    clientAddress: '',
    clientEmail: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: '12',
    numberOfUsers: '5', // Default to 5 users
    baseFee: '',
    setupFee: '',
    additionalNotes: '',
    clientSignature: '',
    clientSignDate: '',
    providerSignature: '',
    providerSignDate: '',
  });

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, { price?: number; description?: string }>>({});
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, { price?: number; description?: string }>>({});
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxRate2, setTaxRate2] = useState<number>(0);

  // Load saved agreement data and organization settings
  useEffect(() => {
    const loadData = async () => {
      if (organization?.id) {
        setIsLoading(true);
        try {
          const { agreement } = await subscriptionAgreementAPI.get(organization.id);
          if (agreement) {
            setAgreementData(agreement.data || agreementData);
            setSelectedModules(agreement.selectedModules || []);
            setSelectedServices(agreement.selectedServices || []);
            setModuleOverrides(agreement.moduleOverrides || {});
            setServiceOverrides(agreement.serviceOverrides || {});
          }
        } catch (error) {
          // Failed to load subscription agreement – non-critical
        } finally {
          setIsLoading(false);
        }
      }
      
      // Load SuperAdmin tax rates
      try {
        const orgId = localStorage.getItem('currentOrgId');
        if (orgId) {
          const settings = await settingsAPI.getOrganizationSettings(orgId);
          if (settings) {
            setTaxRate(settings.tax_rate ?? 0);
            setTaxRate2(settings.tax_rate_2 ?? 0);
          }
        }
      } catch (err) {
        // Failed to load global tax settings – non-critical
      }
    };
    loadData();
  }, [organization?.id]);

  // Prefill with organization data when available
  useEffect(() => {
    if (organization && !isLoading) {
      setAgreementData(prev => ({
        ...prev,
        clientCompany: prev.clientCompany || organization.name || '',
        clientAddress: prev.clientAddress || (organization as any).address || '',
        clientEmail: prev.clientEmail || (organization as any).billingEmail || '',
      }));
    }
  }, [organization, isLoading]);

  const modules: Module[] = [
    { id: 'dashboard', name: 'Dashboard & Analytics', description: 'Real-time metrics, charts, and KPI tracking', price: 0 },
    { id: 'contacts', name: 'Contact Management', description: 'Comprehensive customer and lead database', price: 0 },
    { id: 'deals', name: 'Deal Pipeline', description: 'Visual sales pipeline with stage tracking', price: 0 },
    { id: 'quotes', name: 'Quotes & Proposals', description: 'Professional quote generation and tracking', price: 0 },
    { id: 'projects', name: 'Project Management', description: 'Task management, timelines, and collaboration', price: 29 },
    { id: '3d-planner', name: '3D Planner Modules', description: 'Deck & Garage 3D visualization tools', price: 49 },
    { id: 'ai-suggestions', name: 'AI Suggestions', description: 'Intelligent recommendations and insights', price: 39 },
    { id: 'marketing', name: 'Marketing Automation', description: 'Email campaigns, templates, and tracking', price: 29 },
    { id: 'reports', name: 'Advanced Reports', description: 'Custom reports and data exports', price: 19 },
    { id: 'team', name: 'Team Dashboard', description: 'Multi-user collaboration and oversight', price: 19 },
    { id: 'documents', name: 'Document Storage', description: 'Secure cloud document management', price: 15 },
    { id: 'import-export', name: 'Import/Export Tools', description: 'Data migration and backup capabilities', price: 15 },
  ];

  const services: Service[] = [
    { id: 'onboarding', name: 'Onboarding & Training', description: 'Personalized setup and team training sessions', price: 299 },
    { id: 'support-priority', name: 'Priority Support', description: '24/7 priority email and phone support', price: 49 },
    { id: 'data-migration', name: 'Data Migration Service', description: 'Professional data import from existing systems', price: 499 },
    { id: 'customization', name: 'Custom Development', description: 'Tailored features and integrations', price: 150 },
    { id: 'consulting', name: 'Business Consulting', description: 'CRM strategy and optimization consulting', price: 200 },
  ];

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return;
    }

    setIsSaving(true);
    try {
      await subscriptionAgreementAPI.save(organization.id, {
        data: agreementData,
        selectedModules,
        selectedServices,
        moduleOverrides,
        serviceOverrides,
        savedAt: new Date().toISOString(),
      });
      toast.success('Subscription agreement saved successfully');
    } catch (error) {
      toast.error('Failed to save subscription agreement');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => {
    const numberOfUsers = parseInt(agreementData.numberOfUsers) || 1;
    
    const modulesCost = modules
      .filter(m => selectedModules.includes(m.id))
      .reduce((sum, m) => {
        const overridePrice = moduleOverrides[m.id]?.price;
        const price = overridePrice !== undefined ? overridePrice : (m.price || 0);
        return sum + price;
      }, 0);
    
    const servicesCost = services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => {
        const overridePrice = serviceOverrides[s.id]?.price;
        const price = overridePrice !== undefined ? overridePrice : (s.price || 0);
        return sum + price;
      }, 0);

    const baseFee = parseFloat(agreementData.baseFee) || 0;
    const setupFee = parseFloat(agreementData.setupFee) || 0;

    // Apply per-user pricing to modules and base fee
    const modulesCostTotal = modulesCost * numberOfUsers;
    const baseFeeTotal = baseFee * numberOfUsers;
    const monthlyRecurring = modulesCostTotal + baseFeeTotal;
    
    // Tax calculation
    const taxAmount1 = taxRate > 0 ? (monthlyRecurring * taxRate) / 100 : 0;
    const taxAmount2 = taxRate2 > 0 ? (monthlyRecurring * taxRate2) / 100 : 0;
    const totalMonthlyTax = taxAmount1 + taxAmount2;

    const setupTax1 = taxRate > 0 ? (setupFee * taxRate) / 100 : 0;
    const setupTax2 = taxRate2 > 0 ? (setupFee * taxRate2) / 100 : 0;
    const totalSetupTax = setupTax1 + setupTax2;

    const servicesTax1 = taxRate > 0 ? (servicesCost * taxRate) / 100 : 0;
    const servicesTax2 = taxRate2 > 0 ? (servicesCost * taxRate2) / 100 : 0;
    const totalServicesTax = servicesTax1 + servicesTax2;

    return {
      modules: modulesCost,
      modulesTotal: modulesCostTotal,
      services: servicesCost,
      base: baseFee,
      baseTotal: baseFeeTotal,
      setup: setupFee,
      numberOfUsers: numberOfUsers,
      monthlyRecurring: monthlyRecurring,
      monthlyTax: totalMonthlyTax,
      monthlyTotalWithTax: monthlyRecurring + totalMonthlyTax,
      setupTax: totalSetupTax,
      servicesTax: totalServicesTax,
      total: monthlyRecurring + totalMonthlyTax + servicesCost + totalServicesTax + baseFeeTotal + setupFee + totalSetupTax // Check logical sum
    };
  };

  const totals = calculateTotal();
  const selectedModuleDetails = modules
    .filter((module) => selectedModules.includes(module.id))
    .map((module) => ({
      ...module,
      displayPrice: moduleOverrides[module.id]?.price ?? module.price ?? 0,
      displayDescription: moduleOverrides[module.id]?.description || module.description,
    }));

  const selectedServiceDetails = services
    .filter((service) => selectedServices.includes(service.id))
    .map((service) => ({
      ...service,
      displayPrice: serviceOverrides[service.id]?.price ?? service.price ?? 0,
      displayDescription: serviceOverrides[service.id]?.description || service.description,
    }));

  const openPrintPreview = (autoPrint: boolean) => {
    try {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');

      const agreementDate = new Date().toLocaleDateString();
      const firstPaymentDue = totals.monthlyTotalWithTax + totals.setup + totals.setupTax + totals.services + totals.servicesTax;
      const monthlyTaxRows = totals.monthlyTax > 0
        ? `
          <div class="totals-row">
            <span>Monthly Tax</span>
            <span>${escapeHtml(formatCurrencyValue(totals.monthlyTax))}/month</span>
          </div>
          <div class="totals-row emphasis">
            <span>Total Monthly (w/ Tax)</span>
            <span>${escapeHtml(formatCurrencyValue(totals.monthlyTotalWithTax))}/month</span>
          </div>
        `
        : '';

      const modulesMarkup = selectedModuleDetails.length > 0
        ? selectedModuleDetails.map((module) => `
          <tr>
            <td>
              <strong>${escapeHtml(module.name)}</strong>
              <div class="subcopy">${escapeHtml(module.displayDescription)}</div>
            </td>
            <td>${module.displayPrice === 0 ? 'Included' : `${escapeHtml(formatCurrencyValue(module.displayPrice))}/mo per user`}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="2" class="empty-state">No modules selected.</td></tr>';

      const servicesMarkup = selectedServiceDetails.length > 0
        ? selectedServiceDetails.map((service) => `
          <tr>
            <td>
              <strong>${escapeHtml(service.name)}</strong>
              <div class="subcopy">${escapeHtml(service.displayDescription)}</div>
            </td>
            <td>${service.id === 'support-priority' ? `${escapeHtml(formatCurrencyValue(service.displayPrice))}/mo` : `${escapeHtml(formatCurrencyValue(service.displayPrice))} one-time`}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="2" class="empty-state">No additional services selected.</td></tr>';

      const termsMarkup = AGREEMENT_TERMS.map((term) => `
        <section class="term-block">
          <h4>${escapeHtml(term.title)}</h4>
          <p>${escapeHtml(term.body)}</p>
        </section>
      `).join('');

      const autoPrintScript = autoPrint
        ? `
          <script>
            window.addEventListener('load', function () {
              window.focus();
              window.print();
            });
          <\/script>
        `
        : '';

      const printableHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Subscription Agreement - ${escapeHtml(agreementData.clientCompany || organization?.name || 'ProSpaces CRM')}</title>
            <style>
              :root { color-scheme: light; }
              * { box-sizing: border-box; }
              body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #e2e8f0; line-height: 1.5; }
              .page { max-width: 900px; margin: 32px auto; background: #ffffff; padding: 40px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12); }
              .toolbar { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 24px; }
              .toolbar button { border: none; border-radius: 999px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; background: #0f172a; color: #ffffff; }
              .toolbar .secondary { background: #e2e8f0; color: #0f172a; }
              .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
              .eyebrow { display: inline-block; text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; color: #475569; margin-bottom: 8px; }
              h1 { margin: 0; font-size: 32px; line-height: 1.1; }
              h2 { margin: 0 0 12px; font-size: 18px; }
              h4 { margin: 0 0 6px; font-size: 14px; }
              p { margin: 0; }
              .meta { text-align: right; font-size: 14px; color: #475569; }
              .panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
              .panel { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; background: #f8fafc; }
              .details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
              .label { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
              .value { font-size: 15px; color: #0f172a; word-break: break-word; }
              .section { margin-top: 28px; }
              .section-intro { margin-bottom: 12px; color: #475569; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 14px; }
              th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
              td:last-child, th:last-child { text-align: right; white-space: nowrap; }
              .subcopy { color: #475569; font-size: 12px; margin-top: 4px; white-space: pre-wrap; }
              .empty-state { color: #64748b; font-style: italic; }
              .totals { margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; background: #f8fafc; }
              .totals-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 14px; }
              .totals-row.emphasis { font-weight: 700; color: #1d4ed8; }
              .totals-row.grand-total { margin-top: 8px; padding-top: 12px; border-top: 2px solid #cbd5e1; font-size: 18px; font-weight: 700; color: #1d4ed8; }
              .term-block { margin-bottom: 16px; }
              .term-block p { color: #334155; font-size: 14px; }
              .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
              .signature-box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; min-height: 150px; background: #f8fafc; }
              .signature-value { min-height: 52px; margin: 12px 0; font-size: 24px; font-family: 'Times New Roman', serif; color: #0f172a; border-bottom: 2px solid #cbd5e1; }
              .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 12px; color: #64748b; }
              @media print {
                body { background: #ffffff; }
                .page { margin: 0; max-width: none; box-shadow: none; padding: 0; }
                .toolbar { display: none; }
                @page { size: letter; margin: 0.6in; }
              }
              @media (max-width: 720px) {
                .page { margin: 0; padding: 20px; }
                .header, .panel-grid, .details-grid, .signatures { grid-template-columns: 1fr; display: grid; }
                .meta { text-align: left; }
                td:last-child, th:last-child { text-align: left; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="toolbar">
                <button class="secondary" type="button" onclick="window.close()">Close</button>
                <button type="button" onclick="window.print()">Print / Save as PDF</button>
              </div>
              <div class="header">
                <div>
                  <span class="eyebrow">ProSpaces CRM</span>
                  <h1>Software Subscription Agreement</h1>
                  <p style="margin-top: 10px; color: #475569; max-width: 540px;">This document summarizes the selected subscription, pricing, and signatures for the client agreement.</p>
                </div>
                <div class="meta">
                  <div><strong>Agreement Date:</strong> ${escapeHtml(agreementDate)}</div>
                  <div><strong>Organization:</strong> ${escapeHtml(agreementData.clientCompany || organization?.name || 'Not specified')}</div>
                </div>
              </div>
              <div class="panel-grid">
                <section class="panel">
                  <h2>Provider</h2>
                  <p>ProSpaces CRM</p>
                  <p class="subcopy">Software as a Service Provider</p>
                </section>
                <section class="panel">
                  <h2>Client</h2>
                  <div class="details-grid">
                    <div><span class="label">Contact Person</span><span class="value">${escapeHtml(agreementData.clientName || 'Not specified')}</span></div>
                    <div><span class="label">Company</span><span class="value">${escapeHtml(agreementData.clientCompany || 'Not specified')}</span></div>
                    <div><span class="label">Address</span><span class="value">${escapeHtml(agreementData.clientAddress || 'Not specified')}</span></div>
                    <div><span class="label">Email</span><span class="value">${escapeHtml(agreementData.clientEmail || 'Not specified')}</span></div>
                  </div>
                </section>
              </div>
              <section class="section">
                <h2>Subscription Period</h2>
                <div class="panel details-grid">
                  <div><span class="label">Start Date</span><span class="value">${escapeHtml(formatDisplayDate(agreementData.startDate))}</span></div>
                  <div><span class="label">Duration</span><span class="value">${escapeHtml(getDurationLabel(agreementData.duration))}</span></div>
                  <div><span class="label">Agreement End Date</span><span class="value">${escapeHtml(getAgreementEndDate(agreementData.startDate, agreementData.duration))}</span></div>
                  <div><span class="label">Licensed Users</span><span class="value">${escapeHtml(totals.numberOfUsers)} user${totals.numberOfUsers === 1 ? '' : 's'}</span></div>
                </div>
              </section>
              <section class="section">
                <h2>Included Modules</h2>
                <p class="section-intro">Selected modules included in this subscription.</p>
                <table>
                  <thead><tr><th>Module</th><th>Price</th></tr></thead>
                  <tbody>${modulesMarkup}</tbody>
                </table>
              </section>
              <section class="section">
                <h2>Additional Services</h2>
                <p class="section-intro">One-time and recurring services attached to this agreement.</p>
                <table>
                  <thead><tr><th>Service</th><th>Price</th></tr></thead>
                  <tbody>${servicesMarkup}</tbody>
                </table>
              </section>
              <section class="section">
                <h2>Pricing Details</h2>
                <div class="totals">
                  <div class="totals-row"><span>Base Platform Fee (per user)</span><span>${escapeHtml(formatCurrencyValue(totals.base))}/month</span></div>
                  <div class="totals-row"><span>Selected Modules (per user)</span><span>${escapeHtml(formatCurrencyValue(totals.modules))}/month</span></div>
                  <div class="totals-row"><span>Base Platform Total</span><span>${escapeHtml(formatCurrencyValue(totals.baseTotal))}/month</span></div>
                  <div class="totals-row"><span>Modules Total</span><span>${escapeHtml(formatCurrencyValue(totals.modulesTotal))}/month</span></div>
                  <div class="totals-row"><span>Additional Services</span><span>${escapeHtml(formatCurrencyValue(totals.services))}</span></div>
                  <div class="totals-row"><span>Setup Fee</span><span>${escapeHtml(formatCurrencyValue(totals.setup))}</span></div>
                  <div class="totals-row emphasis"><span>Monthly Recurring Total</span><span>${escapeHtml(formatCurrencyValue(totals.monthlyRecurring))}/month</span></div>
                  ${monthlyTaxRows}
                  <div class="totals-row grand-total"><span>First Payment Due</span><span>${escapeHtml(formatCurrencyValue(firstPaymentDue))}</span></div>
                </div>
                <div class="panel" style="margin-top: 16px;">
                  <span class="label">Additional Notes / Special Terms</span>
                  <div class="value" style="white-space: pre-wrap;">${escapeHtml(agreementData.additionalNotes || 'None provided.')}</div>
                </div>
              </section>
              <section class="section">
                <h2>Terms and Conditions</h2>
                ${termsMarkup}
              </section>
              <section class="section">
                <h2>Signatures</h2>
                <div class="signatures">
                  <div class="signature-box">
                    <span class="label">Client Signature</span>
                    <div class="signature-value">${escapeHtml(agreementData.clientSignature || '')}</div>
                    <div class="details-grid">
                      <div><span class="label">Name</span><span class="value">${escapeHtml(agreementData.clientName || 'Not specified')}</span></div>
                      <div><span class="label">Date</span><span class="value">${escapeHtml(formatDisplayDate(agreementData.clientSignDate))}</span></div>
                    </div>
                  </div>
                  <div class="signature-box">
                    <span class="label">Provider Signature</span>
                    <div class="signature-value">${escapeHtml(agreementData.providerSignature || '')}</div>
                    <div class="details-grid">
                      <div><span class="label">Provider</span><span class="value">ProSpaces CRM</span></div>
                      <div><span class="label">Date</span><span class="value">${escapeHtml(formatDisplayDate(agreementData.providerSignDate))}</span></div>
                    </div>
                  </div>
                </div>
              </section>
              <div class="footer">
                <p>This is a legally binding agreement. Please read carefully before signing.</p>
                <p style="margin-top: 6px;">For questions or concerns, please contact support@prospaces-crm.com</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} ProSpaces CRM. All rights reserved.</p>
              </div>
            </div>
            ${autoPrintScript}
          </body>
        </html>
      `;

      if (!printWindow) {
        // Popup blockers are common in admin panels; print from a hidden iframe as a fallback.
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);

        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          document.body.removeChild(frame);
          toast.error('Unable to create PDF preview in this browser session.');
          return;
        }

        frameWindow.document.open();
        frameWindow.document.write(printableHtml);
        frameWindow.document.close();

        const cleanup = () => {
          setTimeout(() => {
            if (document.body.contains(frame)) {
              document.body.removeChild(frame);
            }
          }, 1000);
        };

        frameWindow.onafterprint = cleanup;
        frameWindow.focus();
        frameWindow.print();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
    } catch (error) {
      toast.error('Failed to create PDF');
    }
  };

  const handlePrint = () => {
    openPrintPreview(true);
  };

  const handleDownloadPdf = () => {
    openPrintPreview(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription agreement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Action Buttons - Hidden when printing */}
        <div className="flex gap-3 mb-6 print:hidden">
          {onBack && (
            <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Organizations
            </Button>
          )}
          {organization && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Agreement'}
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Agreement
          </Button>
          <Button onClick={handleDownloadPdf} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Agreement Document */}
        <Card className="shadow-lg print:shadow-none">
          <CardContent className="p-8 sm:p-12">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <Logo size="lg" className="h-16 w-16" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">ProSpaces CRM</h1>
                  <p className="text-sm text-muted-foreground mt-1">Professional CRM Solutions</p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Agreement Date: {new Date().toLocaleDateString()}</p>
                <p className="flex items-center justify-end gap-1 mt-1">
                  <FileText className="h-3 w-3" />
                  Subscription Agreement
                </p>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Agreement Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                SOFTWARE SUBSCRIPTION AGREEMENT
              </h2>
              <p className="text-muted-foreground">
                This Subscription Agreement is entered into as of the date specified below
              </p>
            </div>

            {/* Parties Section */}
            <div className="mb-8 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">BETWEEN:</h3>
                
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">Provider:</p>
                  <p className="text-sm">ProSpaces CRM</p>
                  <p className="text-sm text-muted-foreground">Software as a Service Provider</p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold mb-3">Client:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                    <div>
                      <Label htmlFor="clientName" className="text-xs">Full Name / Contact Person</Label>
                      <Input
                        id="clientName"
                        value={agreementData.clientName}
                        onChange={(e) => setAgreementData({ ...agreementData, clientName: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                        placeholder="Enter client name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientCompany" className="text-xs">Company Name</Label>
                      <Input
                        id="clientCompany"
                        value={agreementData.clientCompany}
                        onChange={(e) => setAgreementData({ ...agreementData, clientCompany: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="clientAddress" className="text-xs">Business Address</Label>
                      <Input
                        id="clientAddress"
                        value={agreementData.clientAddress}
                        onChange={(e) => setAgreementData({ ...agreementData, clientAddress: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="clientEmail" className="text-xs">Email Address</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={agreementData.clientEmail}
                        onChange={(e) => setAgreementData({ ...agreementData, clientEmail: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Terms and Conditions */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">TERMS AND CONDITIONS</h3>
              
              <div className="space-y-4 text-sm text-foreground">
                {AGREEMENT_TERMS.map((term) => (
                  <div key={term.title}>
                    <h4 className="font-semibold mb-2">{term.title}</h4>
                    <p>{term.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-8" />

            {/* Agreement Duration */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">SUBSCRIPTION PERIOD</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <Label htmlFor="startDate" className="text-xs flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={agreementData.startDate}
                    onChange={(e) => setAgreementData({ ...agreementData, startDate: e.target.value })}
                    className="mt-1 print:border-none print:p-0 print:h-auto"
                  />
                </div>
                <div>
                  <Label htmlFor="duration" className="text-xs">Subscription Duration</Label>
                  <Select value={agreementData.duration} onValueChange={(value) => setAgreementData({ ...agreementData, duration: value })}>
                    <SelectTrigger className="mt-1 print:border-none print:p-0 print:h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months (1 Year)</SelectItem>
                      <SelectItem value="24">24 Months (2 Years)</SelectItem>
                      <SelectItem value="36">36 Months (3 Years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numberOfUsers" className="text-xs">Number of Users</Label>
                  <Input
                    id="numberOfUsers"
                    type="number"
                    min="1"
                    value={agreementData.numberOfUsers}
                    onChange={(e) => setAgreementData({ ...agreementData, numberOfUsers: e.target.value })}
                    className="mt-1 print:border-none print:p-0 print:h-auto"
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-sm text-muted-foreground">
                  Agreement End Date: {new Date(new Date(agreementData.startDate).setMonth(new Date(agreementData.startDate).getMonth() + parseInt(agreementData.duration))).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Licensed Users: {agreementData.numberOfUsers || 0} user{parseInt(agreementData.numberOfUsers) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Modules Selection */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">INCLUDED MODULES</h3>
              <p className="text-sm text-muted-foreground mb-4">Select the modules to be included in this subscription:</p>
              
              <div className="space-y-2">
                {modules.map((module) => {
                  const isEditing = editingModule === module.id;
                  const overridePrice = moduleOverrides[module.id]?.price;
                  const overrideDescription = moduleOverrides[module.id]?.description;
                  const displayPrice = overridePrice !== undefined ? overridePrice : module.price;
                  const displayDescription = overrideDescription || module.description;
                  
                  return (
                    <div key={module.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-border">
                      <Checkbox
                        id={`module-${module.id}`}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                        className="mt-1 print:opacity-100"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`module-${module.id}`} className="font-medium cursor-pointer">
                          {module.name}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={overrideDescription || module.description}
                            onChange={(e) => setModuleOverrides(prev => ({
                              ...prev,
                              [module.id]: { ...prev[module.id], description: e.target.value }
                            }))}
                            className="text-xs mt-1"
                            placeholder="Module description"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">{displayDescription}</p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">$</span>
                            <Input
                              type="number"
                              value={overridePrice !== undefined ? overridePrice : module.price}
                              onChange={(e) => setModuleOverrides(prev => ({
                                ...prev,
                                [module.id]: { ...prev[module.id], price: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-20 h-8 text-sm"
                              placeholder="0"
                            />
                            <span className="text-xs">/mo</span>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold">
                            {displayPrice === 0 ? 'Included' : `$${displayPrice}/mo`}
                          </p>
                        )}
                        <div className="print:hidden flex gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingModule(null)}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setModuleOverrides(prev => {
                                    const newOverrides = { ...prev };
                                    delete newOverrides[module.id];
                                    return newOverrides;
                                  });
                                  setEditingModule(null);
                                }}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingModule(module.id)}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="my-8" />

            {/* Services Selection */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">ADDITIONAL SERVICES</h3>
              <p className="text-sm text-muted-foreground mb-4">Select additional services (one-time or monthly fees as noted):</p>
              
              <div className="space-y-2">
                {services.map((service) => {
                  const isEditing = editingService === service.id;
                  const overridePrice = serviceOverrides[service.id]?.price;
                  const overrideDescription = serviceOverrides[service.id]?.description;
                  const displayPrice = overridePrice !== undefined ? overridePrice : service.price;
                  const displayDescription = overrideDescription || service.description;
                  
                  return (
                    <div key={service.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-border">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                        className="mt-1 print:opacity-100"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`service-${service.id}`} className="font-medium cursor-pointer">
                          {service.name}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={overrideDescription || service.description}
                            onChange={(e) => setServiceOverrides(prev => ({
                              ...prev,
                              [service.id]: { ...prev[service.id], description: e.target.value }
                            }))}
                            className="text-xs mt-1"
                            placeholder="Service description"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">{displayDescription}</p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">$</span>
                            <Input
                              type="number"
                              value={overridePrice !== undefined ? overridePrice : service.price}
                              onChange={(e) => setServiceOverrides(prev => ({
                                ...prev,
                                [service.id]: { ...prev[service.id], price: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-20 h-8 text-sm"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">
                              {service.id === 'support-priority' ? '/mo' : '(one-time)'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold">
                            {service.id === 'support-priority' ? `$${displayPrice}/mo` : `$${displayPrice} (one-time)`}
                          </p>
                        )}
                        <div className="print:hidden flex gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingService(null)}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setServiceOverrides(prev => {
                                    const newOverrides = { ...prev };
                                    delete newOverrides[service.id];
                                    return newOverrides;
                                  });
                                  setEditingService(null);
                                }}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingService(service.id)}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="my-8" />

            {/* Pricing Section */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">PRICING DETAILS</h3>
              
              <div className="bg-muted p-6 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="baseFee" className="text-xs">Base Platform Fee (monthly)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">$</span>
                      <Input
                        id="baseFee"
                        type="number"
                        value={agreementData.baseFee}
                        onChange={(e) => setAgreementData({ ...agreementData, baseFee: e.target.value })}
                        className="print:border-none print:p-0 print:h-auto"
                        placeholder="0.00"
                      />
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="setupFee" className="text-xs">One-Time Setup Fee</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">$</span>
                      <Input
                        id="setupFee"
                        type="number"
                        value={agreementData.setupFee}
                        onChange={(e) => setAgreementData({ ...agreementData, setupFee: e.target.value })}
                        className="print:border-none print:p-0 print:h-auto"
                        placeholder="0.00"
                      />
                      <span className="text-sm text-muted-foreground">(one-time)</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Cost Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground">Base Platform Fee (per user):</span>
                    <span className="font-medium">${totals.base.toFixed(2)}/month</span>
                  </div>
                  {totals.numberOfUsers > 1 && (
                    <div className="flex justify-between text-xs text-muted-foreground ml-4">
                      <span>× {totals.numberOfUsers} users</span>
                      <span>${totals.baseTotal.toFixed(2)}/month</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-foreground">Selected Modules (per user):</span>
                    <span className="font-medium">${totals.modules.toFixed(2)}/month</span>
                  </div>
                  {totals.numberOfUsers > 1 && (
                    <div className="flex justify-between text-xs text-muted-foreground ml-4">
                      <span>× {totals.numberOfUsers} users</span>
                      <span>${totals.modulesTotal.toFixed(2)}/month</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-foreground">Additional Services:</span>
                    <span className="font-medium">${totals.services.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground">Setup Fee:</span>
                    <span className="font-medium">${totals.setup.toFixed(2)} (one-time)</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-base font-semibold">
                    <span>Monthly Recurring Total ({totals.numberOfUsers} user{totals.numberOfUsers !== 1 ? 's' : ''}):</span>
                    <span className="text-purple-600">${totals.monthlyRecurring.toFixed(2)}/month</span>
                  </div>
                  {totals.monthlyTax > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Monthly Tax:</span>
                      <span>${totals.monthlyTax.toFixed(2)}/month</span>
                    </div>
                  )}
                  {totals.monthlyTax > 0 && (
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total Monthly (w/ Tax):</span>
                      <span className="text-purple-600">${totals.monthlyTotalWithTax.toFixed(2)}/month</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold mt-2">
                    <span>First Payment Due:</span>
                    <span className="text-purple-600">${(totals.monthlyTotalWithTax + totals.setup + totals.setupTax + totals.services + totals.servicesTax).toFixed(2)}</span>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="mt-4">
                  <Label htmlFor="additionalNotes" className="text-xs">Additional Notes / Special Terms</Label>
                  <textarea
                    id="additionalNotes"
                    value={agreementData.additionalNotes}
                    onChange={(e) => setAgreementData({ ...agreementData, additionalNotes: e.target.value })}
                    className="w-full mt-1 p-2 border border-border rounded-md text-sm print:border-none print:p-0"
                    rows={3}
                    placeholder="Enter any special terms, discounts, or additional notes..."
                  />
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Signature Section */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">SIGNATURES</h3>
              <p className="text-sm text-muted-foreground mb-6">
                By signing below, both parties agree to all terms and conditions outlined in this Subscription Agreement.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client Signature */}
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <Label className="text-xs font-semibold text-foreground mb-2 block">CLIENT SIGNATURE</Label>
                    <Input
                      value={agreementData.clientSignature}
                      onChange={(e) => setAgreementData({ ...agreementData, clientSignature: e.target.value })}
                      className="font-serif text-xl h-16 mb-3 print:border-none print:p-0 print:h-auto"
                      placeholder="Type signature here"
                    />
                    <div className="border-t-2 border-border pt-2">
                      <Input
                        type="date"
                        value={agreementData.clientSignDate}
                        onChange={(e) => setAgreementData({ ...agreementData, clientSignDate: e.target.value })}
                        className="text-sm print:border-none print:p-0 print:h-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Date</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold">{agreementData.clientName || 'Client Name'}</p>
                    <p>{agreementData.clientCompany || 'Company Name'}</p>
                    <p className="text-muted-foreground mt-1">Client / Authorized Representative</p>
                  </div>
                </div>

                {/* Provider Signature */}
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <Label className="text-xs font-semibold text-foreground mb-2 block">PROVIDER SIGNATURE</Label>
                    <Input
                      value={agreementData.providerSignature}
                      onChange={(e) => setAgreementData({ ...agreementData, providerSignature: e.target.value })}
                      className="font-serif text-xl h-16 mb-3 print:border-none print:p-0 print:h-auto"
                      placeholder="Type signature here"
                    />
                    <div className="border-t-2 border-border pt-2">
                      <Input
                        type="date"
                        value={agreementData.providerSignDate}
                        onChange={(e) => setAgreementData({ ...agreementData, providerSignDate: e.target.value })}
                        className="text-sm print:border-none print:p-0 print:h-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Date</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold">ProSpaces CRM</p>
                    <p>Software as a Service Provider</p>
                    <p className="text-muted-foreground mt-1">Authorized Representative</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
              <p>This is a legally binding agreement. Please read carefully before signing.</p>
              <p className="mt-1">For questions or concerns, please contact: support@prospaces-crm.com</p>
              <p className="mt-2">© {new Date().getFullYear()} ProSpaces CRM. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:h-auto {
            height: auto !important;
          }
          .print\\:opacity-100 {
            opacity: 1 !important;
          }
          @page {
            margin: 1cm;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}