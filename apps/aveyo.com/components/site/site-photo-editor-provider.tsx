"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { SitePhotoEditModal } from "@/components/site/site-photo-edit-modal";
import { SiteVideoEditModal } from "@/components/site/site-video-edit-modal";
import { useMarketingSiteAuthSession } from "@/lib/auth/session";
import { canEditMarketingSitePhotosFromSession } from "@/lib/auth/marketing-photo-access";
import {
  buildMarketingSitePhotoSlotKey,
  fetchMarketingSitePhotoOverrides,
  resolveMarketingSitePhotoSrc,
  type MarketingSitePhotoOverrides,
  type MarketingSitePhotoRecord
} from "@/lib/marketing/site-photos";

interface OpenSitePhotoEditorInput {
  slotKey: string;
  defaultSrc: string;
  currentSrc: string;
  cropAspect?: number;
}

interface OpenSiteVideoEditorInput {
  slotKey: string;
  defaultSrc: string;
  currentSrc: string;
  label?: string;
}

interface SitePhotoEditorContextValue {
  canEdit: boolean;
  overrides: MarketingSitePhotoOverrides;
  resolvePhotoSrc: (slotKey: string, defaultSrc: string) => string;
  upsertOverride: (photo: MarketingSitePhotoRecord) => void;
  removeOverride: (slotKey: string) => void;
  openSitePhotoEditor: (input: OpenSitePhotoEditorInput) => void;
  openSiteVideoEditor: (input: OpenSiteVideoEditorInput) => void;
}

const SitePhotoEditorContext = createContext<SitePhotoEditorContextValue | null>(null);

export function useSitePhotoEditor() {
  const context = useContext(SitePhotoEditorContext);
  if (!context) {
    throw new Error("useSitePhotoEditor must be used within SitePhotoEditorProvider.");
  }
  return context;
}

export function useSitePhotoEditorOptional() {
  return useContext(SitePhotoEditorContext);
}

export function SitePhotoEditorProvider({ children }: { children: ReactNode }) {
  const session = useMarketingSiteAuthSession();
  const [overrides, setOverrides] = useState<MarketingSitePhotoOverrides>({});
  const [activePhotoEdit, setActivePhotoEdit] = useState<OpenSitePhotoEditorInput | null>(null);
  const [activeVideoEdit, setActiveVideoEdit] = useState<OpenSiteVideoEditorInput | null>(null);

  const canEdit = canEditMarketingSitePhotosFromSession(session);

  useEffect(() => {
    let cancelled = false;

    fetchMarketingSitePhotoOverrides()
      .then((nextOverrides) => {
        if (!cancelled) {
          setOverrides(nextOverrides);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverrides({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvePhotoSrc = useCallback(
    (slotKey: string, defaultSrc: string) => resolveMarketingSitePhotoSrc(slotKey, defaultSrc, overrides),
    [overrides]
  );

  const upsertOverride = useCallback((photo: MarketingSitePhotoRecord) => {
    setOverrides((current) => ({
      ...current,
      [photo.slotKey]: photo
    }));
  }, []);

  const removeOverride = useCallback((slotKey: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[slotKey];
      return next;
    });
  }, []);

  const openSitePhotoEditor = useCallback(
    (input: OpenSitePhotoEditorInput) => {
      if (!canEdit) {
        return;
      }
      setActiveVideoEdit(null);
      setActivePhotoEdit(input);
    },
    [canEdit]
  );

  const openSiteVideoEditor = useCallback(
    (input: OpenSiteVideoEditorInput) => {
      if (!canEdit) {
        return;
      }
      setActivePhotoEdit(null);
      setActiveVideoEdit(input);
    },
    [canEdit]
  );

  const value = useMemo(
    () => ({
      canEdit,
      overrides,
      resolvePhotoSrc,
      upsertOverride,
      removeOverride,
      openSitePhotoEditor,
      openSiteVideoEditor
    }),
    [
      canEdit,
      overrides,
      resolvePhotoSrc,
      upsertOverride,
      removeOverride,
      openSitePhotoEditor,
      openSiteVideoEditor
    ]
  );

  return (
    <SitePhotoEditorContext.Provider value={value}>
      {children}

      {activePhotoEdit ? (
        <SitePhotoEditModal
          open
          onOpenChange={(open) => {
            if (!open) {
              setActivePhotoEdit(null);
            }
          }}
          slotKey={activePhotoEdit.slotKey}
          defaultSrc={activePhotoEdit.defaultSrc}
          currentSrc={activePhotoEdit.currentSrc}
          aspect={activePhotoEdit.cropAspect}
          onSaved={(photo) => {
            if (photo) {
              upsertOverride(photo);
              return;
            }
            removeOverride(activePhotoEdit.slotKey);
          }}
        />
      ) : null}

      {activeVideoEdit ? (
        <SiteVideoEditModal
          open
          onOpenChange={(open) => {
            if (!open) {
              setActiveVideoEdit(null);
            }
          }}
          slotKey={activeVideoEdit.slotKey}
          defaultSrc={activeVideoEdit.defaultSrc}
          currentSrc={activeVideoEdit.currentSrc}
          label={activeVideoEdit.label}
          onSaved={(record) => {
            if (record) {
              upsertOverride(record);
              return;
            }
            removeOverride(activeVideoEdit.slotKey);
          }}
        />
      ) : null}
    </SitePhotoEditorContext.Provider>
  );
}

export function useResolvedSitePhoto(defaultSrc: string, photoSlot?: string) {
  const editor = useSitePhotoEditorOptional();
  const slotKey = photoSlot ?? buildMarketingSitePhotoSlotKey(defaultSrc);
  const resolvedSrc = editor ? editor.resolvePhotoSrc(slotKey, defaultSrc) : defaultSrc;

  return {
    slotKey,
    resolvedSrc,
    canEdit: editor?.canEdit ?? false,
    openSitePhotoEditor: editor?.openSitePhotoEditor,
    openSiteVideoEditor: editor?.openSiteVideoEditor
  };
}
