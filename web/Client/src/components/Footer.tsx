export default function Footer() {
  const ls = { color: '#3182ce' };
  return (
    <footer>
      <p>
        <u>
          <a href="mailto:support@shimaodexibao.dpdns.org" style={ls}>
            support@shimaodexibao.dpdns.org
          </a>
        </u>
      </p>
      <p>
        <u>
          <a href="/terms-of-service" style={ls}>
            Terms of Service
          </a>
        </u>{' '}
        |{' '}
        <u>
          <a href="/privacy-policy" style={ls}>
            Privacy Policy
          </a>
        </u>
      </p>
    </footer>
  );
}
