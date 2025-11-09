import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  resetUrl: string;
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your NEMSS09 password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Reset Request</Heading>
        <Text style={text}>
          We received a request to reset your password for your NEMSS09 account.
        </Text>
        <Text style={text}>
          Click the button below to create a new password:
        </Text>
        <Link
          href={resetUrl}
          target="_blank"
          style={button}
        >
          Reset Password
        </Link>
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={code}>{resetUrl}</Text>
        <Text style={warningText}>
          This link will expire in 1 hour for security reasons.
        </Text>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </Text>
        <Text style={footer}>
          <Link
            href="https://www.nemss09.com"
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            NEMSS09 Alumni Association
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#0E3B43',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  padding: '0',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const button = {
  backgroundColor: '#0E3B43',
  borderRadius: '6px',
  color: '#F8E39C',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '14px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const link = {
  color: '#0E3B43',
  textDecoration: 'underline',
};

const warningText = {
  color: '#d9534f',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '16px',
  fontWeight: '500',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '24px',
};

const code = {
  backgroundColor: '#f4f4f4',
  border: '1px solid #e1e8ed',
  borderRadius: '4px',
  color: '#0E3B43',
  display: 'block',
  fontSize: '14px',
  padding: '12px',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
};
