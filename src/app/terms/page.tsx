import { TopBar } from "@/components/TopBar";
import "../articles.css";
import Link from "next/link";
export default async function Terms() {
  return (
    <>
      <TopBar className={""}></TopBar>
      <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10 gap-5">
        <h1 className={"text-3xl font-bold"}>Terms of Service</h1>
        <div className={"-mt-2 text-muted-foreground"}>
          Last updated on: April 1, 2026
        </div>
        <div className={"border-b"}></div>
        <div className={"article"}>
          <p>
            These Terms of Service (“Terms”) govern your access to and use of
            Ferris.love (the “Service”). By accessing or using the Service, you
            agree to be bound by these Terms.
          </p>
          <p>If you do not agree to these Terms, do not use the Service.</p>
          <h3 id="eligibility">1. Eligibility</h3>
          <p>You may use the Service only if you:</p>
          <ul>
            <li>
              Are legally capable of entering into a binding contract in your
              jurisdiction, and
            </li>
            <li>
              Are not prohibited from using the Service under applicable law.
            </li>
          </ul>
          <p>
            By using Ferris.love, you represent and warrant that you meet these
            requirements.
          </p>
          <h3 id="account-and-github-authentication">
            2. Account and GitHub Authentication
          </h3>
          <p>
            To use certain features of the Service, you must sign in using your
            GitHub account.
          </p>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the security of your GitHub account</li>
            <li>
              Ensuring that the information you provide is accurate and up to
              date
            </li>
            <li>
              All activities that occur under your account while using the
              Service
            </li>
          </ul>
          <p>
            We are not liable for any loss or damage arising from unauthorized
            access to your account due to your actions or omissions.
          </p>
          <h3 id="repository-access-and-permissions">
            3. Repository Access and Permissions
          </h3>
          <p>
            By connecting a repository to Ferris.love, you grant us the
            permissions necessary to:
          </p>
          <ul>
            <li>Access that repository and its contents</li>
            <li>Analyze its Rust code and compute statistics</li>
            <li>
              Create and update any required webhooks or integration settings
              needed for the Service to operate
            </li>
          </ul>
          <p>
            You are responsible for ensuring that you have the right to grant
            these permissions, including on behalf of organizations or teams
            where applicable.
          </p>
          <p>
            You may remove our access at any time through GitHub or by
            disconnecting the repository within the Service. Removing access may
            disable some or all functionality for that repository.
          </p>
          <h3 id="use-of-the-service">4. Use of the Service</h3>
          <p>
            You agree to use Ferris.love only for lawful purposes and in
            compliance with these Terms. You will not:
          </p>
          <ul>
            <li>
              Use the Service in any way that violates applicable laws or
              regulations
            </li>
            <li>
              Attempt to interfere with, compromise, or circumvent the security
              or integrity of the Service
            </li>
            <li>Use the Service to abuse, harass, or harm others</li>
            <li>
              Use the Service to create a competing product that directly
              replicates core functionality in a misleading or confusing manner
            </li>
          </ul>
          <p>
            We reserve the right to investigate and, where appropriate, suspend
            or terminate your access to the Service for any violation of these
            Terms.
          </p>
          <h3 id="content-and-intellectual-property">
            5. Content and Intellectual Property
          </h3>
          <h4 id="your-repositories-and-code">
            5.1. Your repositories and code
          </h4>
          <p>
            You retain all rights to your own code and repository content. We do
            not claim ownership of your repositories.
          </p>
          <p>
            By using the Service, you grant us a limited, non‑exclusive,
            worldwide, revocable license to access, analyze, and process your
            repositories solely for the purpose of operating and improving the
            Service (for example, computing and caching statistics, generating
            badges, and debugging issues).
          </p>
          <h4 id="generated-statistics-and-badges">
            5.2. Generated statistics and badges
          </h4>
          <p>
            We may generate aggregated statistics, visualizations, and badges
            based on your repositories. Subject to your underlying rights in the
            repositories, we may use anonymized or aggregated statistics to
            operate, improve, and promote the Service (for example, to show
            examples or benchmarks), provided that such use does not reasonably
            identify you or your private repositories.
          </p>
          <h4 id="ferris.love-content">5.3. Ferris.love content</h4>
          <p>
            The Service, including all software, design, text, graphics, logos,
            and other materials provided by us, is owned by or licensed to us
            and is protected by intellectual property laws.
          </p>
          <p>
            Except as expressly allowed by these Terms, you may not copy,
            modify, distribute, sell, or lease any part of the Service, nor may
            you reverse engineer or attempt to extract the source code of the
            Service, except to the extent laws prohibit these restrictions.
          </p>
          <h3 id="third‑party-services">6. Third‑Party Services</h3>
          <p>
            Ferris.love depends on third‑party services such as GitHub and cloud
            infrastructure providers. Your use of those services may be governed
            by separate terms and policies, which you are responsible for
            reviewing.
          </p>
          <p>
            We are not responsible for the availability, performance, or actions
            of any third‑party services.
          </p>
          <h3 id="beta-features-and-changes-to-the-service">
            7. Beta Features and Changes to the Service
          </h3>
          <p>
            The Service may be provided on a beta or “as is” basis, especially
            new or experimental features.
          </p>
          <p>
            We may modify, suspend, or discontinue all or part of the Service at
            any time, with or without notice. We will make reasonable efforts to
            avoid breaking changes, but we do not guarantee continuous
            availability.
          </p>
          <h3 id="disclaimers">8. Disclaimers</h3>
          <p>
            The Service is provided <strong>“as is” and “as available”</strong>,
            without warranties of any kind, whether express or implied,
            including but not limited to warranties of merchantability, fitness
            for a particular purpose, non‑infringement, and accuracy of results.
          </p>
          <p>We do not guarantee that:</p>
          <ul>
            <li>The Service will be uninterrupted, secure, or error‑free</li>
            <li>
              Any statistics, metrics, or badges will be complete, correct, or
              suitable for any particular use case
            </li>
          </ul>
          <p>You use the Service at your own risk.</p>
          <h3 id="limitation-of-liability">9. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, in no event will we be
            liable for:
          </p>
          <ul>
            <li>
              Any indirect, incidental, special, consequential, or punitive
              damages, or
            </li>
            <li>Any loss of profits, revenue, data, or goodwill,</li>
          </ul>
          <p>
            arising from or related to your use of or inability to use the
            Service, even if we have been advised of the possibility of such
            damages.
          </p>
          <p>
            To the extent we are found liable, our total cumulative liability
            for all claims arising out of or related to the Service will not
            exceed the greater of:
          </p>
          <ul>
            <li>
              The amount you paid (if any) for the Service in the 3 months
              preceding the event giving rise to the claim, or
            </li>
            <li>USD 50.</li>
          </ul>
          <p>
            Some jurisdictions do not allow the exclusion or limitation of
            certain damages or liabilities, so parts of this section may not
            apply to you.
          </p>
          <h3 id="indemnification">10. Indemnification</h3>
          <p>
            You agree to indemnify and hold harmless Ferris.love and its owners,
            contributors, and service providers from and against any claims,
            liabilities, damages, losses, and expenses (including reasonable
            attorneys’ fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of the Service,</li>
            <li>Your violation of these Terms, or</li>
            <li>Your violation of any rights of another person or entity.</li>
          </ul>
          <h3 id="termination">11. Termination</h3>
          <p>
            You may stop using the Service at any time, and you may revoke our
            GitHub access or disconnect repositories whenever you choose.
          </p>
          <p>
            We may suspend or terminate your access to the Service at any time,
            with or without notice, if we believe that:
          </p>
          <ul>
            <li>You have violated these Terms, or</li>
            <li>
              Your use of the Service creates risk or legal exposure for us or
              other users.
            </li>
          </ul>
          <p>
            Upon termination, your right to use the Service will immediately
            cease. Certain sections of these Terms that by their nature should
            survive termination will continue to apply, including but not
            limited to Sections 5, 8, 9, 10, and 12.
          </p>
          <h3 id="governing-law">12. Governing Law</h3>
          <p>
            These Terms will be governed by and construed in accordance with the
            laws of California, U.S., without regard to its conflict of laws
            principles.
          </p>
          <p>
            Any disputes arising out of or relating to these Terms or the
            Service will be subject to the exclusive jurisdiction of the courts
            located in California, unless applicable law requires otherwise.
          </p>
          <h3 id="changes-to-these-terms">13. Changes to These Terms</h3>
          <p>
            We may revise these Terms from time to time. When we do, we will
            update the “Last updated” date at the top of this page. If changes
            are material, we may provide additional notice (for example, via the
            Service or by email).
          </p>
          <p>
            By continuing to use the Service after the revised Terms become
            effective, you agree to be bound by the updated Terms. If you do not
            agree, you must stop using the Service.
          </p>
          <h3 id="contact">14. Contact</h3>
          <p>
            If you have any questions about these Terms, please contact us at:{" "}
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
