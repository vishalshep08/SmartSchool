import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

interface TermsAndConditionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TermsAndConditionsModal({ open, onClose }: TermsAndConditionsModalProps) {
  const { email, schoolName } = useSchoolSettings();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tnc-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        padding: '0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          borderRadius: 'clamp(0px, (100vw - 768px) * 1000, 16px)',
          width: 'min(100vw, 680px)',
          height: 'clamp(100vh, (100vw - 768px) * -1000, 85vh)',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid hsl(var(--border))',
          flexShrink: 0,
        }}>
          <div>
            <h2 id="tnc-title" className="font-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              Terms of Service
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
              Last updated: 8 April 2026
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '8px', display: 'flex',
              color: 'hsl(var(--muted-foreground))',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--muted))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          fontSize: '14px', lineHeight: '1.7', color: 'hsl(var(--foreground))',
        }}>
          <Section title="1. Acceptance of Terms">
            By accessing and using this school management platform, you agree to be bound by these Terms of Service.
            If you do not agree with any part of these terms, you must not use the platform. Use of the platform constitutes
            full acceptance of these terms as of the date of first access.
          </Section>

          <Section title="2. User Responsibilities">
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>You must keep your login credentials strictly confidential. Do not share your username or password with any other person.</li>
              <li>You are solely responsible for all activity that occurs under your account.</li>
              <li>You must notify the school administration immediately if you suspect any unauthorized use of your account.</li>
              <li>Each user is assigned a single account for their specific role. Creating or using additional accounts is prohibited.</li>
              <li>You must log out of your account at the end of each session, especially on shared devices.</li>
            </ul>
          </Section>

          <Section title="3. Data Usage">
            <p>
              This platform is used by {schoolName || 'the school'} to manage academic records including attendance,
              homework assignments, timetables, fee records, and communication between staff and parents.
            </p>
            <p style={{ marginTop: '8px' }}>
              Data entered into the system is used solely for the purpose of school administration and communication.
              It is not used for advertising, profiling, or any commercial purpose unrelated to academic operations.
            </p>
          </Section>

          <Section title="4. Privacy & Confidentiality">
            <p>
              All student data — including names, attendance records, academic performance, and family information —
              is strictly confidential.
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>Student data is not shared with any third parties except as required by law or for direct school operations.</li>
              <li>Staff must not discuss, print, or transmit student information outside of the system without authorization.</li>
              <li>Parents may only access records pertaining to their own children.</li>
            </ul>
          </Section>

          <Section title="5. Prohibited Actions">
            <p>The following actions are strictly prohibited and may result in immediate account suspension:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>Attempting to access, modify, or view data belonging to other users, students, or parents.</li>
              <li>Using the system to send unauthorized communications or harassment.</li>
              <li>Attempting to reverse engineer, hack, or exploit any part of the platform.</li>
              <li>Uploading malicious files, scripts, or software.</li>
              <li>Using automated bots or scripts to interact with the platform.</li>
              <li>Misrepresenting your identity or role within the system.</li>
            </ul>
          </Section>

          <Section title="6. Account Termination">
            The school administration reserves the right to suspend or terminate any account that violates these terms
            or engages in conduct deemed harmful to the school community, without prior notice.
          </Section>

          <Section title="7. Platform Availability">
            While we endeavour to keep the platform available at all times, scheduled maintenance or unforeseen
            technical issues may cause temporary downtime. The school is not liable for any loss arising from
            unavailability of the platform.
          </Section>

          <Section title="8. Contact">
            {email
              ? <>For any queries regarding these terms, please contact the school administration at <a href={`mailto:${email}`} style={{ color: 'hsl(var(--primary, 245 75% 52%))' }}>{email}</a>.</>
              : 'For any queries regarding these terms, please contact the school administration directly.'
            }
          </Section>

          <Section title="9. Governing Law">
            These Terms of Service are governed by and construed in accordance with the laws of India.
            Any disputes arising out of or in connection with these terms shall be subject to the exclusive
            jurisdiction of the courts of India.
          </Section>

          <Section title="10. Modifications">
            The school reserves the right to update these Terms of Service at any time. Continued use of the
            platform after any changes constitutes acceptance of the new terms.
          </Section>
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
          background: 'hsl(var(--muted))',
        }}>
          <Button onClick={onClose} variant="gradient" className="gap-2">
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 className="font-heading" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'hsl(var(--foreground))' }}>
        {title}
      </h3>
      <div style={{ color: 'hsl(var(--muted-foreground))' }}>{children}</div>
    </div>
  );
}
