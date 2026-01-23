# Database Structure Analysis
## SystemsLink Energy Manager Application

**Document Date:** January 23, 2026  
**Source:** SystemsLink Energy Manager User Guide v2022.1

---

## 1. Executive Summary

The SystemsLink Energy Manager is a comprehensive energy monitoring and targeting system built on a hierarchical 3-level data structure: **Site → Data Set → Data Records**. This analysis extracts the core relational database structure, entity relationships, and key attributes to guide your development planning.

The application supports multiple utility types (Electricity, Gas, Water, Oil, Solid Fuel) with three distinct data entry modes: Invoice Data, Direct Readings, and Profile (30-minute interval) Data.

---

## 2. Core Database Hierarchy

### Level 1: Sites (Locations/Buildings)
**Purpose:** Top-level organizational unit representing physical or logical locations

**Key Attributes:**
- Site Name (unique identifier)
- Site Code/UPRN (Unique Property Reference Number)
- Address (Street, City, County, Country, Postcode)
- Location Details (Latitude, Longitude)
- Contact Information (Phone, Email)
- Status (Active, Closed, Inactive)
- Photo (image storage capability)

### Level 2: Data Sets (Meters/Accounts)
**Purpose:** Represents individual meters or utility accounts within a site

**Key Attributes:**
- Data Set ID (unique system-generated identifier)
- Reference Number (Utility account/MPAN/MPRN/SPID)
- Utility Type (Electricity, Gas, Water, Oil, Solid Fuel)
- Location (meter location within site)
- Supplier Name
- Tariff Name (e.g., Economy 7)
- Meter Status (Open, Closed, Date Closed)
- Classification (Main Meter vs Sub-meter)
- Virtual Flag (calculated/derived data set)

### Level 3: Data Records (Usage/Billing Data)
**Purpose:** Individual meter readings, invoices, or profile intervals

**Key Attributes (common to all modes):**
- Date (Read Date)
- Previous Date (Invoice Start Date)
- Supplier Reference Number
- Invoice Number
- Type (E = Estimate)
- Status (Validation status)
- Batch Number (for grouped imports)
- File Link (scanned invoice, etc.)
- Audit Trail (Last Update, Last User)

---

## 3. Core Entities and Relationships

### 3.1 Sites Table
```
SITES
├── SiteID (PK)
├── SiteName (unique)
├── SiteCode/UPRN (unique)
├── Address (Street, City, County, Country, Postcode)
├── Latitude
├── Longitude
├── Status (lookup to CONFIG_SITE_STATUS)
├── Photo (BLOB)
├── Comments (memo, 32,000 chars)
├── DegreeDay_Area (FK to CONFIG_DEGREE_DAYS)
├── BenchmarkGroup (FK to CONFIG_BENCHMARK)
├── LastUpdate (timestamp)
├── LastUser (FK to USERS)
├── CreatedDate
└── CreatedBy
```

**1:N Relationships:**
- SITES → DATA_SETS (one site has many data sets)
- SITES → CONTACTS (one site has many contact assignments)
- SITES → SITE_GROUPS (many-to-many via junction table)
- SITES → SITE_USER_FIELDS (site numeric and text fields)
- SITES → FILE_LINKS (external document links)

---

### 3.2 Contacts Table
```
CONTACTS
├── ContactID (PK)
├── ContactCode (unique)
├── FirstName
├── LastName / FullName
├── Phone
├── Email
├── EmailReports (boolean)
├── EmailAlarms (boolean - EM Plus only)
├── Comments (memo)
├── LastUpdate
└── LastUser
```

**Relationships:**
- M:N with SITES (via SITE_CONTACTS junction table)
- M:N with DATA_SETS (optional contact associations)

**SITE_CONTACTS Junction Table:**
```
SITE_CONTACTS
├── SiteID (FK)
├── ContactID (FK)
├── EmailReports (boolean)
└── EmailAlarms (boolean)
```

---

### 3.3 Data Sets Table
```
DATA_SETS
├── DataSetID (PK)
├── SiteID (FK to SITES)
├── DataSetName
├── UtilityType (Electricity, Gas, Water, Oil, Solid Fuel)
├── ReferenceNumber (MPAN/MPRN/SPID)
├── Location (within site)
├── Units (kWh, m³, kW, etc.)
├── SupplierID (FK to CONFIG_SUPPLIERS)
├── TariffName
├── Frequency (Monthly, Quarterly, Annual)
├── MeterType (Main, Sub-meter)
├── VirtualFlag (boolean)
├── ExcludeFromReports (boolean)
├── DateClosed
├── Status (Active, Closed)
├── FloorArea (m²)
├── DependencyID (FK - for regression analysis driver)
├── ValidationProfileID (FK to CONFIG_VALIDATION_PROFILES)
├── ProfileAlarmsMax
├── ProfileAlarmThreshold1
├── ProfileAlarmThreshold2
├── MeterReadings (boolean - true if meter register readings)
├── MaxMeterReading (for wrap-around meters)
├── MeterFactor (scale conversion)
├── Import_InvoiceCode
├── Import_DirectCode
├── Import_ProfileCode
├── Comments (memo, 32,000 chars)
├── PreviousValues (audit trail of changes)
├── LastUpdate
└── LastUser
```

**Utility-Specific Fields:**

**ELECTRICITY:**
- HostREC (distribution region)
- VoltageLevel (Low, Medium, High, Extra-High)
- CapacityKVA
- ClassType (network/sub-station)
- MeterOperator

**GAS:**
- MeterSizeM3_Hr
- DataLoggersCount
- NominatedAQ (kWh)
- Interruptible (boolean)
- NominatedSHQ (kWh)
- BoilerType / BoilerSize

**WATER:**
- MeterSizeMM
- WaterWholesalerID (FK)
- SewerageWholesalerID (FK)
- ExcludeUnitsFromReports (boolean)

**Relationships:**
- N:1 with SITES
- 1:N with DATA_INVOICE
- 1:N with DATA_DIRECT
- 1:N with DATA_PROFILE
- 1:N with CONTRACTS
- M:N with DATA_SET_GROUPS (via junction)
- M:N with SITES (via DATA_SET_GROUP_SITES for grouping)
- 1:N with TARGETS
- 1:N with BESTFIT_LINES
- 1:N with TAXES
- 1:N with DATA_SET_USER_FIELDS

---

### 3.4 Data Tables (Three Separate Utility-Based Tables)

#### DATA_INVOICE (and DATA_DIRECT - same structure)
```
DATA_INVOICE / DATA_DIRECT
├── DataID (PK)
├── DataSetID (FK to DATA_SETS)
├── Date (read/invoice date)
├── PreviousDate (invoice period start)
├── TaxPointDate
├── SupplierReference
├── InvoiceNumber
├── Type (E for estimate)
├── BatchNumber (for grouped imports)
├── Status (validation status)
├── Exclude FromReports (boolean)
├── Locked (boolean)
├── PassedForPayment (boolean)
├── DatePaid
├── FileLink (scanned invoice)
├── Notes (memo)
├── LastUpdate
├── LastUser
```

**Meter Readings (up to 8 per invoice):**
```
Meter1_Present, Meter1_Previous, Meter1_Factor, Meter1_Cost
Meter2_Present, Meter2_Previous, Meter2_Factor, Meter2_Cost
... (up to Meter8)
```

**Cost Components:**
```
MaximumDemand, DemandFactor
CapacityCharge, CapacitySplit1Rate, CapacitySplit2Rate
ReactivePower
FuelLevy
TUOS (Transmission Use of System)
DUOS (Distribution Use of System)
TRIAD
Settlement (lump or daily rate)
Fixed (standing charge - lump or daily rate)
PowerFactor
CCL (Climate Change Levy)
GreenChargeAmount, GreenChargePercentage
ROC (Renewable Obligation Charge)
OtherCharges
VAT1, VAT1Percentage, VAT2, VAT2Percentage
TotalCost
```

**Electricity-Specific Split Rates:**
```
SplitRate1_Threshold (cumulative kWh)
SplitRate1_Cost (pence/unit)
SplitRate2_Threshold
SplitRate2_Cost
SplitRate3_Threshold
SplitRate3_Cost
```

**Gas-Specific Fields:**
```
kWhFactor
CalorificValue
CorrectionFactor
```

---

#### DATA_PROFILE
```
DATA_PROFILE
├── ProfileID (PK)
├── DataSetID (FK to DATA_SETS)
├── Date (profile date)
├── Interval1, Interval2, ... Interval48 (30-minute values)
├── DayTotal
├── Units
├── Status (validation)
├── Notes
├── LastUpdate
└── LastUser
```

**Relationships:**
- N:1 with DATA_SETS
- For electricity: kWh, kVArh, Power Factor variants

---

### 3.5 Contracts Table
```
CONTRACTS
├── ContractID (PK)
├── DataSetID (FK - NULL if group contract)
├── SupplierID (FK to CONFIG_SUPPLIERS)
├── ContractMode (Group or Individual)
├── StartDate
├── EndDate
├── UseOfSystem (boolean)
├── LossAdjustmentFactor (boolean)
├── ClockTimeBased (boolean)
├── FixedCharge (lump or daily rate)
├── AvailabilityCharge
├── SettlementCharge (lump or daily rate)
├── Climate_Change_Levy_Rate
├── OtherCharges (multiple items via junction table)
├── LastUpdate
└── LastUser
```

**CONTRACT_RATES Sub-table:**
```
CONTRACT_RATES
├── RateID (PK)
├── ContractID (FK)
├── Meter (1-8, representing time-of-use tiers)
├── RateDescription
├── Cost_PencePer_Unit
├── StartTime (HH:MM)
├── FinishTime (HH:MM)
├── ApplicableMonths (bitmask or array)
├── ApplicableWeekdays (bitmask or array)
├── InvoiceRow (optional override)
└── LastUpdate
```

**CONTRACT_MISC_CHARGES (EM Plus):**
```
CONTRACT_MISC_CHARGES
├── ChargeID (PK)
├── ContractID (FK)
├── ChargeDescription
├── Cost_Rate
├── ValidationTolerance
└── LastUpdate
```

**Relationships:**
- 1:N with DATA_SETS (group or specific)
- 1:N with CONTRACT_RATES
- 1:N with CONTRACT_MISC_CHARGES

---

### 3.6 Taxes Table
```
TAXES
├── TaxID (PK)
├── DataSetID (FK to DATA_SETS)
├── EffectiveDate
├── VATApplicable (boolean)
├── VATStandardRate (%)
├── VATReducedRate (%)
├── VATSplitPercentage (if split)
├── CCLApplicable (boolean)
├── CCLRate (pence/kWh)
├── CCLAgreementFlag (Climate Change Agreement)
├── LastUpdate
└── LastUser
```

**Statutory rates maintained in CONFIG:**
```
CONFIG_VAT_RATES
├── EffectiveDate
├── StandardRate (%)
└── ReducedRate (%)

CONFIG_CCL_RATES
├── EffectiveDate
└── Rate (pence/kWh)
```

---

### 3.7 Targets Table
```
TARGETS
├── TargetID (PK)
├── DataSetID (FK to DATA_SETS)
├── Month (1-12)
├── TargetConsumption (units)
├── BudgetCost (£)
├── LastUpdate
└── LastUser
```

**TIME_SERIES_TARGETS (alternative format):**
```
TIME_SERIES_TARGETS
├── TargetID (PK)
├── DataSetID (FK)
├── StartDate
├── EndDate
├── TargetConsumption
├── BudgetCost
├── LastUpdate
└── LastUser
```

---

### 3.8 Bestfit (Linear Regression) Table
```
BESTFIT_LINES
├── BestfitID (PK)
├── DataSetID (FK to DATA_SETS)
├── Gradient (slope)
├── Intercept (y-intercept)
├── RSquare (regression fit quality)
├── Source (Regression analysis, Manual Entry)
├── SourceDate
├── LastUpdate
└── LastUser
```

---

### 3.9 User Fields Tables

**SITE_USER_FIELDS:**
```
SITE_USER_FIELDS
├── SiteID (FK to SITES)
├── UserField_Value1, Value2, ... Value10 (numeric)
├── UserField_Text1, Text2, ... Text10 (text)
├── Historic_Values (reference to historical values)
└── LastUpdate
```

**DATA_SET_USER_FIELDS:**
```
DATA_SET_USER_FIELDS
├── DataSetID (FK to DATA_SETS)
├── UserField_Value1, Value2, Value3 (numeric)
├── UserField_Text1-5 (text)
├── UserField_Date1, Date2, Date3
└── LastUpdate
```

**DATA_RECORD_USER_FIELDS:**
```
DATA_RECORD_USER_FIELDS
├── DataID (FK to DATA_INVOICE/DIRECT/PROFILE)
├── UserField_Value1, Value2, Value3 (numeric)
├── UserField_Text1 (text)
└── LastUpdate
```

---

## 4. Configuration/Lookup Tables

### CONFIG_UTILITIES
```
CONFIG_UTILITIES
├── UtilityID (PK)
├── UtilityName (Electricity, Gas, Water, Oil, Solid Fuel, Custom)
├── UtilityCode
├── StandardUnits (kWh, m³, kg, etc.)
├── AlternativeUnits (CO2 kg, etc.)
└── IsActive (boolean)
```

### CONFIG_SUPPLIERS
```
CONFIG_SUPPLIERS
├── SupplierID (PK)
├── SupplierName
├── SupplierCode
├── ContactNumber
├── Email
├── Website
└── IsActive (boolean)
```

### CONFIG_VALIDATION_PROFILES
```
CONFIG_VALIDATION_PROFILES
├── ValidationProfileID (PK)
├── ProfileName (e.g., "Invoice Electricity", "Direct Gas")
├── UtilityType
├── DataMode (Invoice, Direct, Profile)
├── Tolerance_PreviousRecord (%)
├── Tolerance_PreviousYear (%)
├── Tolerance_Contract (%)
├── Custom_Thresholds (serialized JSON)
└── IsDefault (boolean)
```

### CONFIG_DEGREE_DAYS
```
CONFIG_DEGREE_DAYS
├── DegreeDay_AreaID (PK)
├── AreaName
├── GridReference / Region
├── MonthlyValues (12 records or normalized annual)
├── LastUpdateDate
└── Source (e.g., "SystemsLink Server")
```

### CONFIG_SITE_STATUS
```
CONFIG_SITE_STATUS
├── StatusID (PK)
├── StatusName (Active, Closed, Inactive, etc.)
└── IsCustom (boolean)
```

### CONFIG_BENCHMARK_GROUPS
```
CONFIG_BENCHMARK_GROUPS
├── BenchmarkGroupID (PK)
├── GroupName
├── TypicalUsage_Per_Unit (normalized)
├── GoodPracticeUsage_Per_Unit
├── PerformanceCategory
└── LastUpdate
```

### CONFIG_SITE_STATUS_VALUES
```
CONFIG_SITE_STATUS_VALUES (lookup)
├── StatusName (Active, Closed, Sold, Leased, etc.)
└── Sequence
```

---

## 5. Grouping and Aggregation Tables

### SITE_GROUPS
```
SITE_GROUPS
├── GroupID (PK)
├── GroupName (unique)
├── Description
├── GroupType (Region, Building Type, Cost Centre, etc.)
├── ParentGroupID (for hierarchical groups)
├── CreatedDate
└── LastUpdate
```

### SITE_GROUP_MEMBERS (Junction)
```
SITE_GROUP_MEMBERS
├── GroupID (FK to SITE_GROUPS)
├── SiteID (FK to SITES)
├── MembershipDate
└── RemovalDate (NULL if current)
```

### DATA_SET_GROUPS
```
DATA_SET_GROUPS
├── DataSetGroupID (PK)
├── GroupName (e.g., "All Electricity", "Sub-meters")
├── Description
├── CreatedDate
└── LastUpdate
```

### DATA_SET_GROUP_MEMBERS (Junction)
```
DATA_SET_GROUP_MEMBERS
├── DataSetGroupID (FK)
├── DataSetID (FK)
├── Factor (%) – percentage of dataset to include
├── MembershipDate
└── RemovalDate (NULL if current)
```

---

## 6. Virtual Data Sets

**VIRTUAL_DATA_SETS_FORMULA:**
```
VIRTUAL_DATA_SETS_FORMULA
├── VirtualDataSetID (PK / FK to DATA_SETS)
├── FormulaType (Subtraction, Addition, Average, etc.)
├── BaseDataSetID (FK - primary component)
└── Calculation_JSON (serialized: [{"op":"subtract","dataSetID":123,"factor":1.0}])
```

**Example:** Main Meter - Sub-meter = Unmetered Usage

---

## 7. Communications & Events Tables (EM Plus)

### COMMUNICATIONS
```
COMMUNICATIONS
├── CommunicationID (PK)
├── SiteID (FK to SITES) / DataSetID (FK)
├── CommunicationType (Issue, Note, Action, etc.)
├── Category (lookup)
├── SubCategory (lookup)
├── Title
├── Description (memo)
├── Priority
├── ActionDuration
├── DateCreated
├── CreatedBy (FK to USERS)
├── DateResolved
├── ResolvedBy
└── LastUpdate
```

### EVENTS (EM Plus)
```
EVENTS
├── EventID (PK)
├── SiteID (FK) / DataSetID (FK)
├── EventType
├── EventDescription
├── DateOccurred
├── DateRecorded
├── RecordedBy
└── Details (memo)
```

---

## 8. Audit & Security Tables

### USERS
```
USERS
├── UserID (PK)
├── Username (unique)
├── PasswordHash
├── FullName
├── Email
├── IsAdmin (boolean)
├── IsActive (boolean)
├── DateCreated
├── LastLogin
└── PasswordChangedDate
```

### AUDIT_TRAIL
```
AUDIT_TRAIL
├── AuditID (PK)
├── UserID (FK to USERS)
├── TableName
├── RecordID
├── OperationType (INSERT, UPDATE, DELETE)
├── OldValues (JSON)
├── NewValues (JSON)
├── DateChanged
└── ClientIP
```

### CHANGE_HISTORY (per table)
```
SITE_CHANGE_HISTORY / DATA_SET_CHANGE_HISTORY
├── ChangeID (PK)
├── SiteID or DataSetID (FK)
├── FieldName
├── OldValue
├── NewValue
├── ChangedDate
├── ChangedBy
```

---

## 9. File Links Table

### FILE_LINKS
```
FILE_LINKS
├── FileLinkID (PK)
├── SiteID (FK) / DataSetID (FK) / DataID (FK)
├── LinkType (e.g., "Building Survey", "Site Plan", "Invoice")
├── LinkCaption
├── FilePath / URL
├── FileType
├── UploadDate
├── UploadedBy
└── IsActive
```

---

## 10. Import Batch Tracking

### IMPORT_BATCHES
```
IMPORT_BATCHES
├── BatchID (PK)
├── BatchNumber (user-assigned)
├── UtilityType
├── DataMode (Invoice, Direct, Profile)
├── ImportedRecordCount
├── ValidationStatus (Pass, Fail, Review)
├── ImportDate
├── ImportedBy
├── Source_FileName
├── Notes
└── DeletedDate (NULL if not deleted)
```

---

## 11. Photo/Image Storage

### SITE_PHOTOS
```
SITE_PHOTOS
├── PhotoID (PK)
├── SiteID (FK to SITES)
├── PhotoData (BLOB - PNG, GIF, JPEG, BMP)
├── UploadDate
├── UploadedBy
└── Notes
```

### DATA_SET_PHOTOS
```
DATA_SET_PHOTOS
├── PhotoID (PK)
├── DataSetID (FK to DATA_SETS)
├── PhotoData (BLOB)
├── UploadDate
├── UploadedBy
└── Notes
```

---

## 12. Relationships Diagram Summary

```
USERS
  ├─→ SITES (1:N) - CreatedBy, LastUser
  ├─→ CONTACTS (1:N) - LastUser
  ├─→ DATA_SETS (1:N) - CreatedBy, LastUser
  ├─→ IMPORT_BATCHES (1:N) - ImportedBy
  └─→ AUDIT_TRAIL (1:N)

SITES (1:N)
  ├─→ DATA_SETS
  ├─→ SITE_CONTACTS (M:N via junction)
  ├─→ SITE_GROUPS (M:N via junction)
  ├─→ SITE_USER_FIELDS (1:1)
  ├─→ FILE_LINKS (1:N)
  ├─→ SITE_PHOTOS (1:N)
  ├─→ COMMUNICATIONS (1:N)
  ├─→ EVENTS (1:N)
  └─→ SITE_CHANGE_HISTORY (1:N)

CONTACTS (M:N)
  └─→ SITES (via SITE_CONTACTS junction)

CONFIG_SUPPLIERS (1:N)
  ├─→ DATA_SETS
  └─→ CONTRACTS

DATA_SETS (1:N)
  ├─→ DATA_INVOICE
  ├─→ DATA_DIRECT
  ├─→ DATA_PROFILE
  ├─→ CONTRACTS (1:N)
  ├─→ TARGETS (1:N)
  ├─→ BESTFIT_LINES (1:N)
  ├─→ TAXES (1:N)
  ├─→ DATA_SET_USER_FIELDS (1:1)
  ├─→ FILE_LINKS (1:N)
  ├─→ DATA_SET_PHOTOS (1:N)
  ├─→ DATA_SET_GROUPS (M:N via junction)
  ├─→ COMMUNICATIONS (1:N)
  ├─→ EVENTS (1:N)
  └─→ DATA_SET_CHANGE_HISTORY (1:N)

DATA_INVOICE / DATA_DIRECT / DATA_PROFILE (N:1)
  ├─→ DATA_SETS
  ├─→ DATA_RECORD_USER_FIELDS (1:1)
  └─→ FILE_LINKS (1:N)

CONTRACTS (1:N)
  ├─→ CONTRACT_RATES
  └─→ CONTRACT_MISC_CHARGES

CONFIG_DEGREE_DAYS (1:N)
  └─→ SITES (as DegreeDay_Area)

CONFIG_VALIDATION_PROFILES (1:N)
  └─→ DATA_SETS (as InvoiceValidationProfile)

SITE_GROUPS (1:N)
  └─→ SITE_GROUP_MEMBERS

DATA_SET_GROUPS (1:N)
  └─→ DATA_SET_GROUP_MEMBERS

VIRTUAL_DATA_SETS_FORMULA
  └─→ DATA_SETS (1:1 reference)
```

---

## 13. Key Database Design Considerations

### Normalization
- **1NF:** All fields contain atomic values; separate tables for multi-valued attributes
- **2NF:** Non-key attributes depend on entire primary key
- **3NF:** No transitive dependencies between non-key attributes
- **Special Cases:** User fields use 1:1 extension tables for flexibility

### Data Integrity
- Foreign keys enforce referential integrity
- Audit trail captures all changes for compliance
- Soft deletes (DateClosed, RemovalDate) preserve history
- Batch numbers enable transaction-like behavior for imports

### Multi-Mode Operation
- Three separate invoice/direct/profile tables allow independent data entry
- Each mode can exist independently for cross-checking
- Validation profiles differ by utility and mode

### Extensibility
- User fields (3 numeric, 5 text, 3 date per level) without schema changes
- Custom validation profiles
- Virtual data sets via formula engine
- Configuration tables for dynamic lookup values

### Performance Considerations
- SiteID, DataSetID, DataID as surrogate keys for efficient JOINs
- Indexed fields: SiteName, ReferenceNumber, MPAN/MPRN/SPID
- Batch operations for bulk imports
- Aggregation tables (SITE_GROUP_MEMBERS) for fast report generation

### Security
- User authentication with role-based access
- Audit trail with user and IP tracking
- Data locking per invoice
- Change history for compliance

---

## 14. Recommended Primary & Foreign Key Indexes

**Primary Keys (CREATE UNIQUE INDEX):**
- SITES: SiteID, SiteName, SiteCode
- DATA_SETS: DataSetID, ReferenceNumber
- CONTACTS: ContactID, ContactCode
- CONFIG_SUPPLIERS: SupplierID, SupplierName

**Foreign Key Indexes:**
- SITES.DegreeDay_Area → CONFIG_DEGREE_DAYS
- DATA_SETS.SiteID → SITES
- DATA_SETS.SupplierID → CONFIG_SUPPLIERS
- DATA_INVOICE/DIRECT/PROFILE.DataSetID → DATA_SETS
- CONTRACTS.DataSetID → DATA_SETS

**Query Optimization Indexes:**
- DATA_INVOICE.Date (for date range queries)
- DATA_INVOICE.BatchNumber (for import tracking)
- SITE_GROUP_MEMBERS.GroupID, SiteID (for group reports)
- DATA_SET_GROUP_MEMBERS.GroupID, DataSetID

---

## 15. Export/Import Considerations

### Standard Import Formats Supported
- Supplier EDI files (utility-specific)
- Standard Text format (delimited)
- Custom Format (user-configured mapping)
- Profile data from AMR/BEMS systems
- Contract details in bulk

### Data Validation Rules
- MPAN format validation (13 digits + profile component)
- MPRN format validation (10 digits)
- SPID format validation (water)
- Tolerance checks vs previous records (%)
- Tolerance checks vs previous year (%)
- Contract rate matching

---

## 16. Reporting Infrastructure

### Report-Friendly Structure
- Apportioned vs Non-Apportioned data views (separate calculations)
- Aggregation at Site and Group levels
- Cost normalization by dependency variables (Floor Area, Degree Days)
- Virtual data sets for calculated metrics

### SQL Query Building
- Direct SQL access to database for custom reports
- Support for MS Access queries (if using Access backend)
- SQL Server compatibility for enterprise deployments

---

## 17. Implementation Recommendations

### Phase 1: Core Tables
1. USERS, SITES, DATA_SETS
2. CONFIG_UTILITIES, CONFIG_SUPPLIERS
3. DATA_INVOICE, DATA_DIRECT, DATA_PROFILE
4. CONTACTS, SITE_CONTACTS

### Phase 2: Features
1. CONTRACTS, CONTRACT_RATES
2. TARGETS, BESTFIT_LINES
3. SITE_GROUPS, DATA_SET_GROUPS
4. TAXES, USER_FIELDS tables

### Phase 3: Advanced
1. VIRTUAL_DATA_SETS_FORMULA
2. COMMUNICATIONS, EVENTS
3. FILE_LINKS, PHOTOS
4. AUDIT_TRAIL, CHANGE_HISTORY

### Database Platform
- **Default:** Microsoft Access 2007+ (EM.MDB)
- **Enterprise:** Microsoft SQL Server 2008+
- **Modern Alternative:** PostgreSQL, MySQL (would require adapter layer)

---

## 18. Sample ERD Notation

```
SITES ||--o{ DATA_SETS : contains
SITES ||--o{ SITE_GROUPS : "member of"
DATA_SETS ||--o{ DATA_INVOICE : "has invoice data"
DATA_SETS ||--o{ DATA_DIRECT : "has direct data"
DATA_SETS ||--o{ DATA_PROFILE : "has profile data"
DATA_SETS ||--o{ CONTRACTS : "associated with"
CONTRACTS ||--o{ CONTRACT_RATES : defines
CONFIG_SUPPLIERS ||--o{ DATA_SETS : supplies
CONFIG_DEGREE_DAYS ||--o{ SITES : used_for_regression
USERS ||--o{ SITES : creates/updates
SITES ||--o{ SITE_CONTACTS : has_contacts
CONTACTS ||--o{ SITE_CONTACTS : assigned_to
```

---

## 19. Conclusion

The SystemsLink Energy Manager database is a well-structured 3-level hierarchy optimized for energy monitoring, reporting, and compliance. The separation of invoice, direct, and profile data modes provides flexibility for different data collection methodologies while maintaining referential integrity.

**Key strengths for your development:**
- Clear hierarchy enables intuitive UI navigation
- Multiple data modes support various utility types
- Built-in audit and change tracking
- Flexible user fields avoid schema changes
- Comprehensive configuration tables
- Support for both centralized and multi-group organizational structures

This analysis provides a solid foundation for your relational database design and development planning.

---

**Document Prepared By:** Database Analysis Team  
**Last Updated:** January 23, 2026  
**Technology Context:** Relational Database Design for Energy Management Systems
