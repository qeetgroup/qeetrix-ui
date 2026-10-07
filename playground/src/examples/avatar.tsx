import { CheckIcon } from "@qeetrix/icons";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@qeetrix/ui";
import { tenants, users } from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/**
 * Sample profile photos, as inline SVG data so the playground needs no network and never logs a
 * failed image request. The colours are image data, not UI styling.
 */
function portrait(skin: string, hair: string, shirt: string, background: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${background}"/><path d="M10 64c2-13 11-19 22-19s20 6 22 19z" fill="${shirt}"/><circle cx="32" cy="27" r="12" fill="${skin}"/><path d="M19 26c0-9 6-14 13-14s13 5 13 14c-3-5-8-7-13-7s-10 2-13 7z" fill="${hair}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** User id → photo URL; users without one show their initials. */
const photos: Readonly<Record<string, string | undefined>> = {
  usr_01: portrait("#c98b62", "#2b1d16", "#3f5f8a", "#dfe7f2"),
  usr_02: portrait("#b77b55", "#1d1612", "#6a3d5c", "#f1e4d8"),
  usr_03: portrait("#d9a07a", "#3a2418", "#2f6b5a", "#e5efe9"),
};

const team = users.slice(0, 4);

/** "Acme India Pvt Ltd" → "AI": legal suffixes would make the default first+last rule read "AL". */
function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("");
}
const avatarSizes = ["xs", "sm", "default", "lg", "xl"] as const;

const avatarControls = {
  name: text("Rohan Mehta", "name (alt text + initials)"),
  size: select(avatarSizes, "default"),
  shape: select(["circle", "square"] as const, "circle"),
  image: bool(true, "Image (AvatarImage)"),
  badge: bool(false, "Badge (AvatarBadge)"),
};

export const examples: FamilyExamples = {
  avatar: {
    minHeight: 300,
    demos: [
      {
        name: "Sizes",
        description: "Fixed pixel steps (20–48 px) so a person looks the same in any density.",
        render: () => (
          <div className="flex items-center gap-3">
            {avatarSizes.map((size) => (
              <Avatar key={size} size={size} name="Ananya Iyer">
                <AvatarFallback />
              </Avatar>
            ))}
          </div>
        ),
      },
      {
        name: "Image with fallback",
        description:
          "`name` becomes the image’s alt and the initials; the fallback shows until the image loads.",
        render: () => (
          <div className="flex items-center gap-3">
            <Avatar size="lg" name="Rohan Mehta">
              <AvatarImage src={photos.usr_02} />
              <AvatarFallback />
            </Avatar>
            <Avatar size="lg" name="Priya Nair">
              <AvatarImage src={photos.usr_03} />
              <AvatarFallback />
            </Avatar>
            <Avatar size="lg" name="Vikram Singh">
              <AvatarFallback />
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback aria-label="Unknown user" />
            </Avatar>
          </div>
        ),
      },
      {
        name: "Square (organisations)",
        description:
          '`shape="square"` for tenants and apps; pass initials when the name ends in a legal suffix.',
        render: () => (
          <div className="flex items-center gap-3">
            {tenants.slice(0, 4).map((tenant) => (
              <Avatar key={tenant.id} size="lg" shape="square" name={tenant.name}>
                <AvatarFallback>{orgInitials(tenant.name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ),
      },
      {
        name: "With badge",
        description: "Put the badge’s meaning in text too — colour alone is not a status.",
        render: () => (
          <div className="flex items-center gap-3">
            <Avatar size="sm" name="Arjun Reddy">
              <AvatarFallback />
              <AvatarBadge>
                <span className="sr-only">Has unread mentions</span>
              </AvatarBadge>
            </Avatar>
            <Avatar name="Ananya Iyer">
              <AvatarImage src={photos.usr_01} />
              <AvatarFallback />
              <AvatarBadge>
                <CheckIcon aria-hidden />
                <span className="sr-only">Verified owner</span>
              </AvatarBadge>
            </Avatar>
            <Avatar size="xl" name="Sanjay Gupta">
              <AvatarFallback />
              <AvatarBadge className="bg-success text-success-foreground">
                <CheckIcon aria-hidden />
                <span className="sr-only">Passkey enrolled</span>
              </AvatarBadge>
            </Avatar>
          </div>
        ),
      },
      {
        name: "Group",
        description: "Name every avatar, and give the overflow count a full sentence.",
        render: () => (
          <AvatarGroup>
            {team.map((member) => (
              <Avatar key={member.id} name={member.name}>
                {photos[member.id] && <AvatarImage src={photos[member.id]} />}
                <AvatarFallback />
              </Avatar>
            ))}
            <AvatarGroupCount aria-label={`${users.length - team.length} more members`}>
              +{users.length - team.length}
            </AvatarGroupCount>
          </AvatarGroup>
        ),
      },
      {
        name: "In a user row",
        description: 'The name is visible beside it, so the avatar stays unnamed (alt="").',
        render: () => (
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage src={photos.usr_02} alt="" />
              <AvatarFallback aria-hidden>RM</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">Rohan Mehta</div>
              <div className="text-caption text-muted-foreground">Admin · rohan.mehta@acme.in</div>
            </div>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: avatarControls,
      render: (v) => (
        <Avatar size={v.size} shape={v.shape} name={v.name || undefined}>
          {v.image && <AvatarImage src={photos.usr_02} />}
          <AvatarFallback />
          {v.badge && (
            <AvatarBadge>
              <CheckIcon aria-hidden />
              <span className="sr-only">Verified</span>
            </AvatarBadge>
          )}
        </Avatar>
      ),
      code: (v) =>
        jsx(
          "Avatar",
          {
            size: v.size === "default" ? undefined : v.size,
            shape: v.shape === "circle" ? undefined : v.shape,
            name: v.name || undefined,
          },
          [
            v.image ? "<AvatarImage src={user.avatarUrl} />" : "",
            "<AvatarFallback />",
            v.badge
              ? jsx("AvatarBadge", {}, [
                  "<CheckIcon aria-hidden />",
                  '<span className="sr-only">Verified</span>',
                ])
              : "",
          ],
        ),
    }),
  },
};
