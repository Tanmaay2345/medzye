"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { DETAILS_UNAVAILABLE_MESSAGE } from "@/lib/queries/medicine-details";
import type { MedicineDetails, MedicineWithPrice } from "@/types/database";

const TAB_CONFIG = [
  { value: "activity", label: "Medicine Activity" },
  { value: "uses", label: "Uses" },
  { value: "side-effects", label: "Side Effects" },
  { value: "composition", label: "Composition" },
  { value: "manufacturer", label: "Manufacturer Details" },
];

function DetailText({ value }: { value: string }) {
  return (
    <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
      {value}
    </p>
  );
}

export function MedicineTabs({
  medicine,
  details = null,
}: {
  medicine: MedicineWithPrice;
  /**
   * The medicine's row from medicine_details, read on the server. Null means
   * the bulk generation script hasn't covered this medicine yet — the tabs say
   * so rather than trying to produce content on the fly.
   */
  details?: MedicineDetails | null;
}) {
  /**
   * `fallback` is the medicine's own column, used when the generated content
   * isn't there. It keeps Medicine Activity and Manufacturer Details behaving
   * exactly as they did before medicine_details existed, so an ungenerated
   * medicine degrades to its previous content instead of blanking.
   */
  const renderBody = (value: string | null | undefined, fallback?: string | null) => {
    if (value) return <DetailText value={value} />;
    if (fallback) return <DetailText value={fallback} />;
    return <EmptyState title={DETAILS_UNAVAILABLE_MESSAGE} />;
  };

  return (
    <Tabs defaultValue="activity" className="w-full gap-6">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-0 border-b border-brand-gray-100 bg-white p-0"
      >
        {TAB_CONFIG.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-auto rounded-none border-none px-4 py-3.5 text-sm font-medium text-brand-gray-500 after:bg-brand-primary data-active:bg-transparent data-active:text-brand-gray-900 data-active:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="activity">
        {renderBody(details?.medicine_activity, medicine.description)}
      </TabsContent>

      <TabsContent value="uses">{renderBody(details?.uses)}</TabsContent>

      <TabsContent value="side-effects">{renderBody(details?.side_effects)}</TabsContent>

      <TabsContent value="composition">
        {renderBody(details?.composition, medicine.description)}
      </TabsContent>

      <TabsContent value="manufacturer">
        {renderBody(details?.manufacturer_details, medicine.manufacturer)}
      </TabsContent>
    </Tabs>
  );
}
