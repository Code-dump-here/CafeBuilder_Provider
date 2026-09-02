"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Compass,
  DoorOpen,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import {
  useAddSiteFloorMutation,
  useAddSiteOpeningMutation,
  useCreateSiteProfileMutation,
  useRemoveSiteFloorMutation,
  useRemoveSiteOpeningMutation,
  useSiteProfile,
  useUpdateSiteFloorMutation,
  useUpdateSiteOpeningMutation,
  useUpdateSiteProfileMutation,
} from "@/features/projects/use-site-profile";
import {
  ORIENTATIONS,
  SITE_OPENING_TYPES,
  type Orientation,
  type SiteFloor,
  type SiteProfile,
  type SiteOpening,
  type SiteOpeningType,
} from "@/features/projects/site-profile-types";

// ---------------------------------------------------------------------------
// Helpers

/**
 * A number input's value as a number, or `undefined` when the field is blank.
 *
 * Blank has to stay `undefined` rather than becoming 0: these fields are
 * optional, and sending 0 would record "this shopfront is zero metres wide"
 * instead of "nobody has measured it".
 */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A nullable number as an input value. */
function toInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

// ---------------------------------------------------------------------------
// Page

export default function SiteProfilePage() {
  const t = useTranslations("SiteProfile");
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";

  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  const { profile, isMissing, isLoading, isError, error, refetch } = useSiteProfile({
    projectShopOwnerId: projectId,
  });

  // Writing needs an `accepted` engagement — anyone who has merely applied can
  // read the measurements but must not change them. The server enforces this;
  // mirroring it here keeps the buttons honest rather than letting the user
  // fill a form in and only then be refused.
  const { engagements } = useEngagements({
    projectId,
    providerId: viewerProfileId ?? undefined,
    enabled: Boolean(projectId) && Boolean(viewerProfileId),
  });
  const canWrite = React.useMemo(
    () => engagements.some((e) => e.status === "accepted"),
    [engagements],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title={t("error.title")}
          subtitle={t("error.subtitle")}
          retryLabel={t("error.retry")}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {isMissing || !profile ? (
        <CreateProfilePanel projectId={projectId} canWrite={canWrite} />
      ) : (
        <>
          <MeasurementsCard profile={profile} canWrite={canWrite} />
          <FloorsCard profile={profile} canWrite={canWrite} />
          <OpeningsCard profile={profile} canWrite={canWrite} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state → create

function CreateProfilePanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("SiteProfile");
  const [open, setOpen] = React.useState(false);
  const mutation = useCreateSiteProfileMutation();

  return (
    <>
      <EmptyState
        icon={Ruler}
        title={t("empty.title")}
        description={canWrite ? t("empty.description") : t("empty.readOnly")}
        actionLabel={canWrite ? t("empty.action") : undefined}
        onAction={canWrite ? () => setOpen(true) : undefined}
      />
      <MeasurementsDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        pending={mutation.isPending}
        onSubmit={(values) => {
          mutation.mutate(
            { projectShopOwnerId: projectId, ...values },
            { onSuccess: () => setOpen(false) },
          );
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Measurements

interface MeasurementValues {
  lengthM?: number;
  widthM?: number;
  frontageWidthM?: number;
  ceilingHeightM?: number;
  roadWidthM?: number;
  orientation?: Orientation;
  floorCount?: number;
  hasMezzanine?: boolean;
  structureNote?: string;
  existingConditionNote?: string;
}

function MeasurementsCard({
  profile,
  canWrite,
}: {
  profile: NonNullable<ReturnType<typeof useSiteProfile>["profile"]>;
  canWrite: boolean;
}) {
  const t = useTranslations("SiteProfile");
  const [open, setOpen] = React.useState(false);
  const mutation = useUpdateSiteProfileMutation();

  const metres = (value: number | null) =>
    value === null ? t("notMeasured") : t("metres", { value });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="size-4 text-primary" aria-hidden />
            {t("measurements.title")}
          </CardTitle>
          <CardDescription>{t("measurements.subtitle")}</CardDescription>
        </div>
        {canWrite ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil aria-hidden />
            {t("measurements.edit")}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label={t("fields.lengthM")} value={metres(profile.lengthM)} />
        <Fact label={t("fields.widthM")} value={metres(profile.widthM)} />
        <Fact label={t("fields.frontageWidthM")} value={metres(profile.frontageWidthM)} />
        <Fact label={t("fields.ceilingHeightM")} value={metres(profile.ceilingHeightM)} />
        <Fact label={t("fields.roadWidthM")} value={metres(profile.roadWidthM)} />
        <Fact
          label={t("fields.orientation")}
          value={
            profile.orientation
              ? t(`orientation.${profile.orientation}`)
              : t("notMeasured")
          }
          icon={Compass}
        />
        <Fact
          label={t("fields.floorCount")}
          value={
            profile.floorCount === null
              ? t("notMeasured")
              : t("floorsValue", { count: profile.floorCount })
          }
          icon={Layers}
        />
        <Fact
          label={t("fields.hasMezzanine")}
          value={profile.hasMezzanine ? t("yes") : t("no")}
        />
        <Fact
          label={t("fields.derivedFootprintM2")}
          value={
            profile.derivedFootprintM2 === null
              ? t("notMeasured")
              : t("squareMetres", { value: profile.derivedFootprintM2 })
          }
          hint={t("fields.derivedFootprintHint")}
        />
        <Fact
          label={t("fields.totalFloorAreaM2")}
          value={
            profile.totalFloorAreaM2 === null
              ? t("notMeasured")
              : t("squareMetres", { value: profile.totalFloorAreaM2 })
          }
          hint={t("fields.totalFloorAreaHint")}
        />
        <Fact
          label={t("fields.projectAreaM2")}
          value={
            profile.projectAreaM2 === null
              ? t("notMeasured")
              : t("squareMetres", { value: profile.projectAreaM2 })
          }
          hint={t("fields.projectAreaHint")}
        />

        {/* Measured here, approved by the owner elsewhere — without this the
            provider has no way to tell whether the figures they recorded are
            the ones the project is actually running on. */}
        {profile.isAreaSyncedToProject === null ? null : (
          <div
            className={`col-span-full flex flex-col gap-1 rounded-md border p-3 ${
              profile.isAreaSyncedToProject
                ? "border-emerald-600/30 bg-emerald-600/5"
                : "border-amber-600/30 bg-amber-600/5"
            }`}
          >
            <p className="text-sm font-medium">
              {profile.isAreaSyncedToProject
                ? t("areaSync.syncedTitle")
                : t("areaSync.pendingTitle")}
            </p>
            {profile.isAreaSyncedToProject ? null : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("areaSync.pendingBody", {
                  surveyed:
                    profile.totalFloorAreaM2 === null
                      ? t("notMeasured")
                      : t("squareMetres", { value: profile.totalFloorAreaM2 }),
                  inForce:
                    profile.projectAreaM2 === null
                      ? t("notMeasured")
                      : t("squareMetres", { value: profile.projectAreaM2 }),
                })}
              </p>
            )}
          </div>
        )}

        {profile.structureNote ? (
          <div className="col-span-full flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("fields.structureNote")}
            </p>
            <p className="text-sm leading-relaxed">{profile.structureNote}</p>
          </div>
        ) : null}
        {profile.existingConditionNote ? (
          <div className="col-span-full flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("fields.existingConditionNote")}
            </p>
            <p className="text-sm leading-relaxed">{profile.existingConditionNote}</p>
          </div>
        ) : null}
      </CardContent>

      <MeasurementsDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        initial={profile}
        pending={mutation.isPending}
        onSubmit={(values) => {
          mutation.mutate(
            { id: profile.id, payload: values },
            { onSuccess: () => setOpen(false) },
          );
        }}
      />
    </Card>
  );
}

function Fact({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="size-3" aria-hidden /> : null}
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

function MeasurementsDialog({
  open,
  onOpenChange,
  mode,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /**
   * The stored record. Its numbers are nullable where the form’s are
   * optional, so this reads the entity shape rather than the payload shape.
   */
  initial?: SiteProfile;
  pending: boolean;
  onSubmit: (values: MeasurementValues) => void;
}) {
  const t = useTranslations("SiteProfile");

  const [lengthM, setLengthM] = React.useState("");
  const [widthM, setWidthM] = React.useState("");
  const [frontageWidthM, setFrontageWidthM] = React.useState("");
  const [ceilingHeightM, setCeilingHeightM] = React.useState("");
  const [roadWidthM, setRoadWidthM] = React.useState("");
  const [orientation, setOrientation] = React.useState<string>("");
  const [floorCount, setFloorCount] = React.useState("");
  const [hasMezzanine, setHasMezzanine] = React.useState(false);
  const [structureNote, setStructureNote] = React.useState("");
  const [existingConditionNote, setExistingConditionNote] = React.useState("");

  // Refill from the record every time the dialog opens, so cancelling and
  // reopening shows what is stored rather than the abandoned edit.
  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setLengthM(toInput(initial?.lengthM));
    setWidthM(toInput(initial?.widthM));
    setFrontageWidthM(toInput(initial?.frontageWidthM));
    setCeilingHeightM(toInput(initial?.ceilingHeightM));
    setRoadWidthM(toInput(initial?.roadWidthM));
    setOrientation(initial?.orientation ?? "");
    setFloorCount(toInput(initial?.floorCount));
    setHasMezzanine(initial?.hasMezzanine ?? false);
    setStructureNote(initial?.structureNote ?? "");
    setExistingConditionNote(initial?.existingConditionNote ?? "");
  });

  const submit = () => {
    onSubmit({
      lengthM: toNumber(lengthM),
      widthM: toNumber(widthM),
      frontageWidthM: toNumber(frontageWidthM),
      ceilingHeightM: toNumber(ceilingHeightM),
      roadWidthM: toNumber(roadWidthM),
      orientation: orientation ? (orientation as Orientation) : undefined,
      floorCount: toNumber(floorCount),
      hasMezzanine,
      structureNote: structureNote.trim() || undefined,
      existingConditionNote: existingConditionNote.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("dialog.createTitle") : t("dialog.editTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label={t("fields.lengthM")} value={lengthM} onChange={setLengthM} />
          <NumberField label={t("fields.widthM")} value={widthM} onChange={setWidthM} />
          <NumberField
            label={t("fields.frontageWidthM")}
            hint={t("fields.frontageHint")}
            value={frontageWidthM}
            onChange={setFrontageWidthM}
          />
          <NumberField
            label={t("fields.ceilingHeightM")}
            value={ceilingHeightM}
            onChange={setCeilingHeightM}
          />
          <NumberField
            label={t("fields.roadWidthM")}
            value={roadWidthM}
            onChange={setRoadWidthM}
          />
          <NumberField
            label={t("fields.floorCount")}
            value={floorCount}
            onChange={setFloorCount}
            step="1"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("fields.orientation")}</label>
            <Select value={orientation} onValueChange={setOrientation}>
              <SelectTrigger>
                <SelectValue placeholder={t("fields.orientationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {ORIENTATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`orientation.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-end gap-2 pb-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={hasMezzanine}
              onChange={(e) => setHasMezzanine(e.target.checked)}
            />
            {t("fields.hasMezzanine")}
          </label>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("fields.structureNote")}</label>
            <Textarea
              rows={2}
              value={structureNote}
              placeholder={t("fields.structurePlaceholder")}
              onChange={(e) => setStructureNote(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">
              {t("fields.existingConditionNote")}
            </label>
            <Textarea
              rows={2}
              value={existingConditionNote}
              placeholder={t("fields.conditionPlaceholder")}
              onChange={(e) => setExistingConditionNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floors

function FloorsCard({
  profile,
  canWrite,
}: {
  profile: NonNullable<ReturnType<typeof useSiteProfile>["profile"]>;
  canWrite: boolean;
}) {
  const t = useTranslations("SiteProfile");
  const [editing, setEditing] = React.useState<SiteFloor | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<SiteFloor | null>(null);

  const addMutation = useAddSiteFloorMutation();
  const updateMutation = useUpdateSiteFloorMutation();
  const removeMutation = useRemoveSiteFloorMutation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" aria-hidden />
            {t("floors.title")}
          </CardTitle>
          <CardDescription>{t("floors.subtitle")}</CardDescription>
        </div>
        {canWrite ? (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("floors.add")}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        {profile.floors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("floors.empty")}
          </p>
        ) : (
          profile.floors.map((floor) => (
            <div
              key={floor.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Badge variant="secondary">{t("floors.no", { no: floor.floorNo })}</Badge>
                  {floor.name ?? t("floors.unnamed")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    floor.areaM2 !== null
                      ? t("squareMetres", { value: floor.areaM2 })
                      : null,
                    floor.ceilingHeightM !== null
                      ? t("ceilingValue", { value: floor.ceilingHeightM })
                      : null,
                    floor.purpose,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("floors.noDetail")}
                </p>
              </div>
              {canWrite ? (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(floor)}>
                    <Pencil className="size-4" aria-hidden />
                    <span className="sr-only">{t("floors.editFloor")}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setRemoving(floor)}>
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                    <span className="sr-only">{t("floors.removeFloor")}</span>
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>

      <FloorDialog
        open={creating || editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        pending={addMutation.isPending || updateMutation.isPending}
        onSubmit={(payload) => {
          const done = () => {
            setCreating(false);
            setEditing(null);
          };
          if (editing) {
            updateMutation.mutate({ floorId: editing.id, payload }, { onSuccess: done });
          } else {
            addMutation.mutate(
              { siteProfileId: profile.id, payload },
              { onSuccess: done },
            );
          }
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={t("floors.removeTitle")}
        description={t("floors.removeDescription")}
        confirmLabel={t("floors.removeConfirm")}
        cancelLabel={t("dialog.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removing) removeMutation.mutate(removing.id);
          setRemoving(null);
        }}
      />
    </Card>
  );
}

function FloorDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SiteFloor | null;
  pending: boolean;
  onSubmit: (payload: {
    floorNo: number;
    name?: string;
    areaM2?: number;
    ceilingHeightM?: number;
    purpose?: string;
    note?: string;
  }) => void;
}) {
  const t = useTranslations("SiteProfile");

  const [floorNo, setFloorNo] = React.useState("1");
  const [name, setName] = React.useState("");
  const [areaM2, setAreaM2] = React.useState("");
  const [ceilingHeightM, setCeilingHeightM] = React.useState("");
  const [purpose, setPurpose] = React.useState("");

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setFloorNo(initial ? String(initial.floorNo) : "1");
    setName(initial?.name ?? "");
    setAreaM2(toInput(initial?.areaM2));
    setCeilingHeightM(toInput(initial?.ceilingHeightM));
    setPurpose(initial?.purpose ?? "");
  });

  const parsedFloorNo = toNumber(floorNo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("floors.editTitle") : t("floors.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("floors.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label={t("floors.floorNo")}
            hint={t("floors.floorNoHint")}
            value={floorNo}
            onChange={setFloorNo}
            step="1"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("floors.name")}</label>
            <Input
              value={name}
              placeholder={t("floors.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <NumberField label={t("floors.areaM2")} value={areaM2} onChange={setAreaM2} />
          <NumberField
            label={t("fields.ceilingHeightM")}
            value={ceilingHeightM}
            onChange={setCeilingHeightM}
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("floors.purpose")}</label>
            <Input
              value={purpose}
              placeholder={t("floors.purposePlaceholder")}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={pending || parsedFloorNo === undefined}
            onClick={() =>
              onSubmit({
                floorNo: parsedFloorNo ?? 1,
                name: name.trim() || undefined,
                areaM2: toNumber(areaM2),
                ceilingHeightM: toNumber(ceilingHeightM),
                purpose: purpose.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Openings

function OpeningsCard({
  profile,
  canWrite,
}: {
  profile: NonNullable<ReturnType<typeof useSiteProfile>["profile"]>;
  canWrite: boolean;
}) {
  const t = useTranslations("SiteProfile");
  const [editing, setEditing] = React.useState<SiteOpening | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<SiteOpening | null>(null);

  const addMutation = useAddSiteOpeningMutation();
  const updateMutation = useUpdateSiteOpeningMutation();
  const removeMutation = useRemoveSiteOpeningMutation();

  const floorLabel = (siteFloorId: string | null) => {
    if (siteFloorId === null) return t("openings.noFloor");
    const floor = profile.floors.find((f) => f.id === siteFloorId);
    if (!floor) return t("openings.noFloor");
    return floor.name ?? t("floors.no", { no: floor.floorNo });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="size-4 text-primary" aria-hidden />
            {t("openings.title")}
          </CardTitle>
          <CardDescription>{t("openings.subtitle")}</CardDescription>
        </div>
        {canWrite ? (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("openings.add")}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        {profile.openings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("openings.empty")}
          </p>
        ) : (
          profile.openings.map((opening) => (
            <div
              key={opening.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Badge variant="outline">{t(`openingType.${opening.type}`)}</Badge>
                  {opening.quantity > 1 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("openings.quantity", { count: opening.quantity })}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {floorLabel(opening.siteFloorId)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    opening.widthM !== null && opening.heightM !== null
                      ? t("openings.size", {
                          width: opening.widthM,
                          height: opening.heightM,
                        })
                      : null,
                    opening.orientation
                      ? t(`orientation.${opening.orientation}`)
                      : null,
                    opening.note,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("openings.noDetail")}
                </p>
              </div>
              {canWrite ? (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(opening)}>
                    <Pencil className="size-4" aria-hidden />
                    <span className="sr-only">{t("openings.editOpening")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoving(opening)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                    <span className="sr-only">{t("openings.removeOpening")}</span>
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>

      <OpeningDialog
        open={creating || editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        floors={profile.floors}
        pending={addMutation.isPending || updateMutation.isPending}
        onSubmit={(payload) => {
          const done = () => {
            setCreating(false);
            setEditing(null);
          };
          if (editing) {
            updateMutation.mutate(
              { openingId: editing.id, payload },
              { onSuccess: done },
            );
          } else {
            addMutation.mutate(
              { siteProfileId: profile.id, payload },
              { onSuccess: done },
            );
          }
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={t("openings.removeTitle")}
        description={t("openings.removeDescription")}
        confirmLabel={t("openings.removeConfirm")}
        cancelLabel={t("dialog.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removing) removeMutation.mutate(removing.id);
          setRemoving(null);
        }}
      />
    </Card>
  );
}

/** Sentinel for "not on a particular floor" — Radix Select rejects `""`. */
const NO_FLOOR = "__none__";

function OpeningDialog({
  open,
  onOpenChange,
  initial,
  floors,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SiteOpening | null;
  floors: SiteFloor[];
  pending: boolean;
  onSubmit: (payload: {
    type: SiteOpeningType;
    siteFloorId?: string;
    orientation?: Orientation;
    widthM?: number;
    heightM?: number;
    quantity?: number;
    note?: string;
  }) => void;
}) {
  const t = useTranslations("SiteProfile");

  const [type, setType] = React.useState<string>("main_door");
  const [siteFloorId, setSiteFloorId] = React.useState<string>(NO_FLOOR);
  const [orientation, setOrientation] = React.useState<string>("");
  const [widthM, setWidthM] = React.useState("");
  const [heightM, setHeightM] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [note, setNote] = React.useState("");

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setType(initial?.type ?? "main_door");
    setSiteFloorId(initial?.siteFloorId ?? NO_FLOOR);
    setOrientation(initial?.orientation ?? "");
    setWidthM(toInput(initial?.widthM));
    setHeightM(toInput(initial?.heightM));
    setQuantity(initial ? String(initial.quantity) : "1");
    setNote(initial?.note ?? "");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("openings.editTitle") : t("openings.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("openings.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("openings.type")}</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITE_OPENING_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`openingType.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("openings.floor")}</label>
            <Select value={siteFloorId} onValueChange={setSiteFloorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FLOOR}>{t("openings.noFloor")}</SelectItem>
                {floors.map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name ?? t("floors.no", { no: floor.floorNo })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NumberField label={t("openings.widthM")} value={widthM} onChange={setWidthM} />
          <NumberField
            label={t("openings.heightM")}
            value={heightM}
            onChange={setHeightM}
          />
          <NumberField
            label={t("openings.quantityLabel")}
            hint={t("openings.quantityHint")}
            value={quantity}
            onChange={setQuantity}
            step="1"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("fields.orientation")}</label>
            <Select value={orientation} onValueChange={setOrientation}>
              <SelectTrigger>
                <SelectValue placeholder={t("fields.orientationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {ORIENTATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`orientation.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("openings.note")}</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSubmit({
                type: type as SiteOpeningType,
                siteFloorId: siteFloorId === NO_FLOOR ? undefined : siteFloorId,
                orientation: orientation ? (orientation as Orientation) : undefined,
                widthM: toNumber(widthM),
                heightM: toNumber(heightM),
                quantity: toNumber(quantity) ?? 1,
                note: note.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
