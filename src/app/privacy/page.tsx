import { TopBar } from "@/components/TopBar";
import "../articles.css";
import Link from "next/link";
export default async function Privacy() {
  return (
    <>
      <TopBar className={""}></TopBar>
      <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10 gap-5">
        <h1 className={"text-3xl font-bold"}>Privacy Policy</h1>
        <div className={"-mt-2 text-muted-foreground"}>
          Last updated on: April 1, 2026
        </div>
        <div className={"border-b"}></div>
        <div className={"article"}>
          <p>
            This Privacy Policy explains how Ferris.love (“we”, “us”, “our”)
            collects, uses, and protects information when you use our website
            and services (collectively, the “Service”).
          </p>
          <p>
            By using Ferris.love, you agree to the collection and use of
            information in accordance with this Policy.
          </p>
          <h2 id="information-we-collect">1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <h3>1.1. GitHub account information</h3>
          <p>
            When you sign in with GitHub, we receive certain information from
            GitHub, such as:
          </p>
          <ul>
            <li>Your GitHub user ID</li>
            <li>Your GitHub username (“login”) and display name</li>
            <li>Your public profile information (e.g. avatar, bio)</li>
            <li>Your public email, if available</li>
          </ul>
          <p>
            We do <strong>not</strong> receive your GitHub password.
          </p>
          <h3>1.2. Repository information</h3>
          <p>When you connect a repository to Ferris.love, we may access:</p>
          <ul>
            <li>
              Basic repository metadata (owner, name, default branch,
              visibility, configured webhooks)
            </li>
            <li>
              Repository contents necessary for analysis of Rust code (e.g.{" "}
              <code>.rs</code> files, <code>Cargo.toml</code>)
            </li>
          </ul>
          <p>
            We do not intentionally collect or store secrets or credentials that
            may be accidentally committed to your repository. However, you
            remain responsible for not committing sensitive information to your
            repositories.
          </p>
          <h3>1.3. Usage data</h3>
          <p>
            We may collect anonymous or aggregated usage information, such as:
          </p>
          <ul>
            <li>Requests to our badge endpoints</li>
            <li>
              Basic log data (IP address, user agent, timestamps, error
              messages)
            </li>
            <li>Performance metrics and service health indicators</li>
          </ul>
          <p>
            This data is used to keep the Service reliable and to help us
            understand how it is used.
          </p>
          <h2 id="how-we-use-your-information">
            2. How We Use Your Information
          </h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>
              To provide the Service, including generating statistics and badges
              for your repositories
            </li>
            <li>To authenticate you via GitHub and maintain your session</li>
            <li>To store and update repository analysis results</li>
            <li>
              To monitor the performance, stability, and security of the Service
            </li>
            <li>
              To communicate important updates or changes related to the Service
            </li>
          </ul>
          <p>We do not sell your personal information.</p>
          <h2 id="repository-access-and-code-processing">
            3. Repository Access and Code Processing
          </h2>
          <p>
            Ferris.love analyzes your repositories in an automated way to
            compute Rust-related statistics (for example, counts of functions,
            structs, or other code constructs).
          </p>
          <ul>
            <li>We access only the repositories you explicitly authorize.</li>
            <li>We process repository contents to compute metrics.</li>
            <li>
              We may temporarily cache or store analysis results, but we do not
              permanently store full copies of your code for purposes unrelated
              to providing the Service.
            </li>
            <li>
              We may register webhooks in the repositories you have authorized,
              in order to track changes in your codebase and keep analysis
              results up to date.
            </li>
          </ul>
          <p>
            You may revoke our access to your repositories at any time via
            GitHub or by disconnecting the repository in Ferris.love. However,
            some cached statistics or log entries may remain for a limited
            period for operational and security reasons.
          </p>
          <h2 id="data-storage-and-retention">4. Data Storage and Retention</h2>
          <p>
            We store data using third‑party infrastructure providers (such as
            cloud platforms and databases). Data may be stored in various
            regions depending on the infrastructure provider.
          </p>
          <p>We retain:</p>
          <ul>
            <li>Account information while your account remains active</li>
            <li>
              Repository statistics while the repository is connected to
              Ferris.love
            </li>
            <li>
              Logs and backups for a limited period as necessary for debugging,
              security, and compliance
            </li>
          </ul>
          <p>
            We may anonymize or aggregate data so that it can no longer
            reasonably be linked to an individual user, and may retain such data
            for longer periods.
          </p>
          <h2 id="cookies-and-similar-technologies">
            5. Cookies and Similar Technologies
          </h2>
          <p>Ferris.love may use cookies or similar technologies to:</p>
          <ul>
            <li>Maintain your login session</li>
            <li>Remember basic preferences</li>
            <li>Measure usage and performance</li>
          </ul>
          <p>
            You can control cookies through your browser settings. Disabling
            cookies may affect some features of the Service.
          </p>
          <h2 id="third‑party-services">6. Third‑Party Services</h2>
          <p>
            Ferris.love integrates with third‑party services, including but not
            limited to:
          </p>
          <ul>
            <li>GitHub (for authentication and repository access)</li>
            <li>Cloudflare (for hosting the service and stroing metrics)</li>
            <li>
              Other cloud infrastructure providers (for processing the
              repositories)
            </li>
          </ul>
          <p>
            These third parties may collect or receive information as described
            in their own privacy policies. We do not control and are not
            responsible for their practices.
          </p>
          <h2 id="security">7. Security</h2>
          <p>
            We take reasonable technical and organizational measures to protect
            your information from unauthorized access, alteration, disclosure,
            or destruction.
          </p>
          <p>
            However, no method of transmission or storage is completely secure,
            and we cannot guarantee absolute security. You are responsible for
            maintaining the security of your GitHub account and for not
            committing secrets or sensitive data to repositories connected to
            Ferris.love.
          </p>
          <h2 id="childrens-privacy">8. Children’s Privacy</h2>
          <p>
            Ferris.love is intended for use by adults and is not directed to
            children under the age of 13 (or the minimum age of digital consent
            in your jurisdiction). We do not knowingly collect personal
            information from children in this age group. If you believe a child
            has provided us with personal information, please contact us and we
            will take steps to remove it.
          </p>
          <h2 id="your-choices-and-rights">9. Your Choices and Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding
            your personal information, such as:
          </p>
          <ul>
            <li>Accessing or updating your account information</li>
            <li>Revoking GitHub access</li>
            <li>
              Unregistering any webhooks that the Service has added to your
              repositories
            </li>
            <li>Requesting deletion of certain data</li>
          </ul>
          <p>
            Most of these actions can be performed directly via GitHub or within
            Ferris.love. If you have questions or specific requests, please
            contact us using the information below.
          </p>
          <h2 id="international-transfers">10. International Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries
            other than the one in which you reside. By using the Service, you
            consent to such transfers, recognizing that the data protection laws
            in those countries may differ from those in your jurisdiction.
          </p>
          <h2 id="changes-to-this-policy">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we
            will change the “Last updated” date at the top of this page. If
            changes are material, we may provide additional notice (for example,
            via the Service or by email).
          </p>
          <p>
            Your continued use of Ferris.love after any changes become effective
            constitutes your acceptance of the revised Policy.
          </p>
          <h2 id="contact">12. Contact</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please contact us at:{" "}
            <Link href="mailto:support@ferris.love" className={"underline"}>
              support@ferris.love
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
