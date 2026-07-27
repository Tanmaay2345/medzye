"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import type { MedicineWithPrice } from "@/types/database";

const EMPTY_TABS = ["uses", "side-effects", "composition"] as const;

const TAB_CONFIG = [
  { value: "activity", label: "Medicine Activity" },
  { value: "uses", label: "Uses" },
  { value: "side-effects", label: "Side Effects" },
  { value: "composition", label: "Composition" },
  { value: "manufacturer", label: "Manufacturer Details" },
];

export function MedicineTabs({ medicine }: { medicine: MedicineWithPrice }) {
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
        {medicine.description ? (
          <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
            {medicine.description}
          </p>
        ) : (
          <EmptyState
            title="No activity information available"
            description="Details for this medicine haven't been added yet."
          />
        )}
      </TabsContent>

      {EMPTY_TABS.map((value) => (
        <TabsContent key={value} value={value}>
          <EmptyState
            title="Information not available"
            description="This section hasn't been added for this medicine yet."
          />
        </TabsContent>
      ))}

      <TabsContent value="manufacturer">
        {medicine.manufacturer ? (
          <p className="text-sm leading-relaxed text-brand-gray-500">
            {medicine.manufacturer}
          </p>
        ) : (
          <EmptyState
            title="Manufacturer details not available"
            description="This section hasn't been added for this medicine yet."
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
