# Trestle field availability — answers + what's now live (GCM Homes)

**To:** Liz
**From:** Vince
**Date:** 2026-08-19
**Re:** your `trestle-field-request.md`
**Status:** ✅ **Done** — the populated fields are added, deployed, and synced into D1 (verified). Merged in PR #108.
Jump to the **API-key table** for exactly what your design reads.

---

## How this was checked (so you can trust the numbers)

I didn't read the RESO dictionary — I **probed the live production feed**: pulled **all 210 active listings**
with no `$select` (so Trestle returned every field it has for each), and counted how many listings actually have a
non-empty value for each field.

So every percentage below is **populated coverage**, not "defined in the schema." That's the distinction you asked
for — and it matters a lot here, because several fields you requested are defined by RESO but **this feed never
fills them.**

---

## TL;DR

- **All the populated fields are already added, deployed, and synced** (see the "DONE & LIVE" section + API-key table below). E.g. the 4 well-populated Group-1 fields — `Flooring`, `Fireplace`, `Roof`, `ListingContractDate` — are live now.
- **3 Group-1 fields are simply NOT in this feed** (0% on all 210): `WaterSource`, **all School fields**, `BuyerAgencyCompensation`. These need a substitute or Grant — details below.
- **The HOA bug is real and fixable:** `AssociationFeeFrequency` is populated on **56%** — the exact same listings as `AssociationFee`. Easy win.
- **The 3D tour CAN exist:** `VirtualTourURLUnbranded` is populated on **54% (113/210)**. Branded is empty — unbranded only. (Bonus: 25% of listings also carry videos.)
- **Three Group-4 fields need a swap, not a drop:** use `Stories` (84%) not `StoriesTotal` (0%); use `ListingContractDate` (100%) not `OnMarketDate` (0%); derive lot **sq ft** from `LotSizeAcres` (62%) since `LotSizeSquareFeet` is 0%.
- Full 205-field populated list is at the bottom — that's your definitive "what the feed actually fills."

---

## Ask 1 — field by field, with what to actually use

Legend: ✅ add it · ⚠️ add but sparse (design to hide when empty) · ❌ not in this feed

### Group 1 — the design names these

| Field | Coverage | Verdict |
|---|---|---|
| `Flooring` | **85%** | ✅ Add. |
| `FireplacesTotal` | **85%** | ✅ Add. `FireplaceYN` (88%) and `FireplaceFeatures` (89%) also available as fallback/detail. |
| `WaterSource` | **0%** | ❌ Not in this feed. No substitute — this is Grant-supplied or drop the row. |
| `Utilities` | **18%** | ⚠️ Sparse. Add it, but the row will be empty on most listings — hide when blank. |
| `PoolPrivateYN` | **0%** | ❌ Not populated. But `PoolFeatures` (3% — 7 listings) is. Derive "Pool: Yes" from `PoolFeatures` presence. (Most Tahoe listings have no pool; `SpaFeatures` 19% / `SpaYN` 17% if you want spa.) |
| `Roof` | **74%** | ✅ Add. |
| `SchoolDistrict` + `ElementarySchool` + `MiddleOrJuniorSchool` + `HighSchool` | **0% (all four)** | ❌ Schools are **not in this feed at all.** This is Grant-supplied content — put it back on the "chase Grant" list. |
| `ListingContractDate` | **100%** | ✅ Add — use this for "Year Listed". (`OnMarketDate` is 0%, so don't use it.) |
| `BuyerAgencyCompensation` | **0%** | ❌ Not populated on any listing. The compliance question is moot — there's nothing to publish. Drop the row. |

### Group 2 — the HOA-frequency bug

| Field | Coverage | Verdict |
|---|---|---|
| `AssociationFeeFrequency` | **56%** | ✅ Add. Populated on the exact same 118 listings as `AssociationFee`, so every fee we show can carry its period. Confirmed bug, clean fix. |

### Group 3 — the 3D tour

| Field | Coverage | Verdict |
|---|---|---|
| `VirtualTourURLUnbranded` | **54% (113/210)** | ✅ Add. The tour section renders on ~half of listings and hides on the rest — exactly the partial-coverage behavior you described. |
| `VirtualTourURLBranded` | **0%** | ❌ Empty — no fallback available. Unbranded only. |

> Bonus: `VideosCount` is populated on **25% (53 listings)** — the feed also carries video media. If you ever want a
> secondary "video" source alongside the 3D tour, it's there.

### Group 4 — optional

| Field | Coverage | Verdict |
|---|---|---|
| `ListingId` | **100%** | ✅ Add — the public MLS number, on every listing. |
| `SubdivisionName` | **0%** | ❌ **Still null on every listing** — confirmed, not fixed at the MLS end. Keep the point-in-polygon neighborhood matching. (No help for Glenbrook/Zephyr Cove from the MLS; those stay a polygon/Grant question.) |
| `LotSizeSquareFeet` | **0%** | ❌ Not provided. But `LotSizeAcres` (62%) is → derive sq ft = acres × 43,560 for smaller lots. |
| `StoriesTotal` | **0%** | ❌ — but **`Stories` is 84%** ✅. Use `Stories` instead. |
| `ArchitecturalStyle` | **31%** | ⚠️ Add, show-when-present. |
| `ConstructionMaterials` | **45%** | ✅ Add. |
| `LotFeatures` | **82%** | ✅ Add — high coverage, exactly the "level/wooded/cul-de-sac" content you want. |
| `PropertyCondition` | **53%** | ✅ Add. |

---

## Bonus — populated fields the design isn't using yet

The feed fills these well and they map to real feature rows, if you want to enrich the cards:

| Field | Coverage | | Field | Coverage |
|---|---|---|---|---|
| `View` | 100% | | `InteriorFeatures` | 84% |
| `Topography` | 100% | | `ExteriorFeatures` | 77% |
| `Heating` | 96% | | `LaundryFeatures` | 77% |
| `ParkingFeatures` | 95% | | `PatioAndPorchFeatures` | 73% |
| `Furnished` | 95% | | `RoomType` | 67% |
| `Appliances` | 89% | | `SecurityFeatures` | 53% |
| `FireplaceFeatures` | 89% | | `AssociationName` | 50% |
| `Stories` | 84% | | `AssociationFeeIncludes` | 48% |

Situational (low coverage, but real): `Cooling` 24% (Tahoe — few have AC), `WindowFeatures` 35%,
`ZoningDescription` 34%, `AssociationAmenities` 23%, `WaterfrontFeatures` 6%.

---

## What we added to the sync — ✅ DONE & LIVE (2026-08-19)

**This is already built, deployed, and synced** — the fields are in D1 and served by the API now (verified: D1
coverage matches the probe numbers above exactly). Merged to the monorepo in **PR #108**. You can build against it
today; the daily 15:00 UTC sync keeps it current.

**Added (16 fields + a derived one):** `Flooring`, `FireplacesTotal`, `FireplaceYN`, `FireplaceFeatures`, `Roof`,
`Utilities`, `PoolFeatures`, `ListingContractDate`, `AssociationFeeFrequency`, `VirtualTourURLUnbranded`, `ListingId`,
`Stories`, `ArchitecturalStyle`, `ConstructionMaterials`, `LotFeatures`, `PropertyCondition`, + derived lot sq ft.

Wired through all touchpoints: `FULL_SELECT` + row map + `LCOLS` (both sync files), D1 `ALTER TABLE`, the detail API
(`toDetail`), and the admin mirror (`EMDASH_MLS_FIELDS` / `MLS_FIELDS` — read-only MLS, not owner fields).

### 🔑 The API keys to render against (this is what your design reads)

The listing detail endpoint (`/api/listing-by-slug/:city/:address`) now returns these on `listing`:

| Design row | API key on `listing` | Source field |
|---|---|---|
| Flooring | `flooring` | Flooring |
| Fireplace | `fireplaces` (count), `fireplaceYN`, `fireplaceFeatures` | FireplacesTotal / FireplaceYN / FireplaceFeatures |
| Roof | `roof` | Roof |
| Utilities | `utilities` | Utilities |
| Pool | `poolFeatures` (present = has pool) | PoolFeatures |
| Year Listed | `listingDate` | ListingContractDate |
| HOA | `hoaFee` + `hoaFrequency` | AssociationFee + AssociationFeeFrequency |
| 3D Tour | `tourUrlMls` | VirtualTourURLUnbranded |
| MLS # | `mlsNumber` | ListingId |
| Stories | `stories` | Stories |
| Arch. Style | `archStyle` | ArchitecturalStyle |
| Construction | `construction` | ConstructionMaterials |
| Lot Features | `lotFeatures` | LotFeatures |
| Condition | `condition` | PropertyCondition |
| Lot (sq ft) | `lotSqft` | derived: LotSizeAcres × 43,560 |

> Array-type MLS values (Flooring, Utilities, LotFeatures, FireplaceFeatures, ConstructionMaterials, ArchStyle,
> PoolFeatures) are stored **comma-joined strings** — split on `", "` if you want chips/pills.

**`tour_url`:** `tourUrlMls` is the MLS unbranded tour (populated 54%). Wire your section to **prefer `tourUrlMls`**
and fall back to the owner's manual `tour_url` when it's empty — your `OWNER_FIELDS` (`headline`, `tour_url`,
`note_image`, `owner_note`) are untouched by the sync, exactly as you asked.

**NOT added (0% populated — nothing to sync):** `WaterSource`, `PoolPrivateYN`, `SchoolDistrict` + the 3 school
fields, `OnMarketDate`, `BuyerAgencyCompensation`, `SubdivisionName`, `StoriesTotal`, `LotSizeSquareFeet`,
`VirtualTourURLBranded`. (Substitutes are in the table above — e.g. use `Stories` not `StoriesTotal`.)

---

## Ask 2 — the definitive populated-field list

Every field this feed fills on ≥1 active listing (of 210 sampled), with coverage %. This is the authoritative
"what's actually available" — design against this, not the RESO dictionary.

```
100%  ListingId, ListingKey, ListingKeyNumeric, PropertyType, PropertySubType, PropertySubTypeAdditional,
      StandardStatus, MlsStatus, ListPrice, OriginalListPrice, CurrentPrice, UnparsedAddress, StreetNumber,
      StreetName, City, PostalCity, StateOrProvince, PostalCode, CountyOrParish, CountrySubdivision,
      Latitude, Longitude, View, Topography, ParcelNumber, TaxLegalDescription, PhotosCount, DaysOnMarket,
      CumulativeDaysOnMarket, ListingContractDate, ContractStatusChangeDate, ModificationTimestamp,
      OriginalEntryTimestamp, StatusChangeTimestamp, MajorChangeTimestamp, MajorChangeType, MLSAreaMajor,
      ListAgentFullName/First/Last/Email/MlsId/Key + phones, ListOfficeName/Key/MlsId/Phone, ListAOR,
      UniversalPropertyId, UniversalParcelId, CLIP, LotSizeUnits, Permission, PublicRemarks (99.5%)
 96%  YearBuilt, LivingArea, Heating, HeatingYN, TaxAnnualAmount, AssociationYN, ListingTerms, ListingAgreement
 95%  ParkingFeatures, Furnished
 93%  BedroomsTotal, BathroomsTotalInteger, BathroomsFull, BathroomsHalf, HomeWarrantyYN
 92%  GarageYN
 89%  Appliances, Possession, FireplaceFeatures
 88%  FireplaceYN
 85%  Flooring, FireplacesTotal
 84%  Stories, InteriorFeatures
 82%  LotFeatures
 80%  LivingAreaSource, StreetSuffix
 77%  LaundryFeatures, ExteriorFeatures
 74%  Roof
 73%  PatioAndPorchFeatures
 71%  PossibleUse
 67%  RoomType
 63%  GarageSpaces
 62%  LotSizeAcres, LotSizeArea, ViewYN
 58%  DevelopmentStatus
 56%  AssociationFee, AssociationFeeFrequency
 54%  VirtualTourURLUnbranded
 53%  SecurityFeatures, PropertyCondition
 51%  OccupantType
 50%  AssociationName
 48%  AssociationFeeIncludes
 45%  ConstructionMaterials, PriceChangeTimestamp
 44%  AttachedGarageYN, PreviousListPrice
 43%  UnitNumber
 40%  AssociationPhone
 38%  CommonInterest
 37%  MainLevelBedrooms
 35%  WindowFeatures
 34%  ZoningDescription
 31%  ArchitecturalStyle
 30%  DirectionFaces
 25%  VideosCount
 24%  Cooling, CoolingYN
 23%  AssociationAmenities
 19%  SpaFeatures
 18%  Utilities
 17%  SpaYN
 15%  DocumentsCount, OpenParkingYN, DelayedMarketingYN
 14%  Co-list agent/office fields (whole set)
 13%  FrontageType
 11%  OtherEquipment
 10%  RoadResponsibility
  7%  RoadFrontageType, DoorFeatures
  6%  WaterfrontFeatures, CommunityFeatures, OtherStructures
  4%  CarportYN, PetsAllowed, GreenWaterConservation
  3%  WaterfrontYN, BasementYN, NewConstructionYN, PoolFeatures, Levels
  1-2% GreenEnergyEfficient, NumberOfUnitsTotal, StreetDirPrefix, (lease/income fields)
  0%  WaterSource, PoolPrivateYN, SchoolDistrict, ElementarySchool, MiddleOrJuniorSchool, HighSchool,
      OnMarketDate, BuyerAgencyCompensation, SubdivisionName, StoriesTotal, LotSizeSquareFeet,
      VirtualTourURLBranded   ← the ones you asked about that this feed does NOT fill
```

(205 distinct fields are populated on ≥1 listing. Anything not listed above is either 0% or an internal
replication/system field.)

---

## Summary for the design

- Fill the cards from: Flooring, Fireplace, Roof, LotFeatures, Stories, ConstructionMaterials, PropertyCondition,
  ArchitecturalStyle, Utilities (sparse), plus the bonus fields above.
- 3D tour: use `VirtualTourURLUnbranded` (54%), section hides when empty.
- HOA: now shows fee **with** frequency.
- **Design around these — they're not coming from this MLS:** water source, schools, buyer-agency comp, subdivision
  name. Schools + water source = Grant content; subdivision stays polygon-derived.
