"use server";

import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Progress } from "@/models/Progress";
import { DayComment } from "@/models/DayComment";
import { WeeklyLog } from "@/models/WeeklyLog";
import { ProbationReview } from "@/models/ProbationReview";
import { MandatoryDoc } from "@/models/MandatoryDoc";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "./auth";
import tasksData from "@/lib/tasks.json";

export async function registerJoinee(prevState: unknown, formData: FormData) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();

    const name = formData.get("name")?.toString().trim();
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const buddy = formData.get("buddy")?.toString().trim() || adminUser.name;
    const startDateVal = formData.get("startDate")?.toString();

    if (!name || !username || !password || !startDateVal) {
      return { success: false, error: "All fields are required" };
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return { success: false, error: "Username is already taken" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newJoinee = new User({
      name,
      username,
      password: hashedPassword,
      role: "joinee",
      buddy,
      startDate: new Date(startDateVal),
    });

    await newJoinee.save();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Register joinee error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getJoineesList() {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const joinees = await User.find({ role: "joinee" }).sort({ createdAt: -1 });

    const totalTasksCount = tasksData.length;

    const list = await Promise.all(
      joinees.map(async (j) => {
        const completedCount = await Progress.countDocuments({
          userId: j._id,
          completed: true,
        });

        const progressPercent = totalTasksCount > 0 
          ? Math.round((completedCount / totalTasksCount) * 100) 
          : 0;

        return {
          id: j._id.toString(),
          name: j.name,
          username: j.username,
          buddy: j.buddy,
          startDate: j.startDate.toISOString(),
          createdAt: j.createdAt.toISOString(),
          completedCount,
          totalTasksCount,
          progressPercent,
        };
      })
    );

    return { success: true, joinees: list };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function seedDefaultLead() {
  try {
    await connectToDatabase();
    const leadCount = await User.countDocuments({ role: "lead" });
    if (leadCount === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const defaultLead = new User({
        name: "Onboarding Buddy",
        username: "admin",
        password: hashedPassword,
        role: "lead",
        startDate: new Date(),
      });
      await defaultLead.save();
      return { success: true, seeded: true };
    }
    return { success: true, seeded: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function deleteJoinee(joineeId: string) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();

    // 1. Delete the user
    await User.deleteOne({ _id: joineeId, role: "joinee" });

    // 2. Delete all progression progress
    await Progress.deleteMany({ userId: joineeId });

    // 3. Delete all day comments
    await DayComment.deleteMany({ userId: joineeId });

    // 4. Delete all weekly logs
    await WeeklyLog.deleteMany({ userId: joineeId });

    // 5. Delete any probation reviews
    await ProbationReview.deleteMany({ userId: joineeId });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Delete joinee error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function seedMandatoryDoc() {
  try {
    await connectToDatabase();
    const docKey = "mandatory-read";
    
    const existingDoc = await MandatoryDoc.findOne({ key: docKey });
    
    const docContent = `# Onboarding Study Guide: US Demographics, Time Zones & Visas

![Image](/media/image1.jpeg)

![Image](/media/image2.jpeg)

## Eastern Time Zone (ET)
* **Connecticut (CT)** – ET
* **Delaware (DE)** – ET
* **District of Columbia (DC)** – ET (not a state, but full ET)
* **Georgia (GA)** – ET
* **Maine (ME)** – ET
* **Maryland (MD)** – ET
* **Massachusetts (MA)** – ET
* **New Hampshire (NH)** – ET
* **New Jersey (NJ)** – ET
* **New York (NY)** – ET
* **North Carolina (NC)** – ET
* **Ohio (OH)** – ET
* **Pennsylvania (PA)** – ET
* **Rhode Island (RI)** – ET
* **South Carolina (SC)** – ET
* **Vermont (VT)** – ET
* **Virginia (VA)** – ET
* **West Virginia (WV)** – ET

## Central Time Zone (CT)
* **Alabama (AL)** – CT
* **Arkansas (AR)** – CT
* **Illinois (IL)** – CT
* **Iowa (IA)** – CT
* **Louisiana (LA)** – CT
* **Minnesota (MN)** – CT
* **Mississippi (MS)** – CT
* **Missouri (MO)** – CT
* **Oklahoma (OK)** – CT
* **Wisconsin (WI)** – CT

## Mountain Time Zone (MT)
* **Colorado (CO)** – MT
* **Montana (MT)** – MT
* **New Mexico (NM)** – MT
* **Utah (UT)** – MT
* **Wyoming (WY)** – MT

## Pacific Time Zone (PT)
* **California (CA)** – PT
* **Nevada (NV)** – PT
* **Washington (WA)** – PT

## Alaska Time Zone (AKT)
* **Alaska (AK)** – AKT (most of the state, excluding Aleutians)

## Hawaii–Aleutian Time Zone (HAT)
* **Hawaii (HI)** – HAT

---

## 1. USA Time Zones
The United States has six time zones but we are working in four standard time zones:
* **EST** (Eastern Standard Time)
* **CST** (Central Standard Time)
* **MST** (Mountain Standard Time)
* **PST** (Pacific Standard Time)

* **AKST** (Alaska Standard Time)
* **HST** (Hawaii Standard Time)

![Image](/media/image3.jpeg)

### Daylight Saving Time (DST) in the USA
The US is one of about 70 countries worldwide using Daylight Saving Time (DST), but Hawaii and most of Arizona don't use it.
Daylight Saving Time (DST) in the United States is the practice of setting clocks forward by one hour during the warmer months to extend evening daylight.

* **Begins**: Second Sunday in March
* **Ends**: First Sunday in November

The primary purpose of DST is to make better use of daylight during the longer days of spring, summer, and early fall.
* **When Does DST Start and End?** DST begins each year on the second Sunday in March, when clocks are set forward by one hour. They are turned back again to standard time on the first Sunday in November.
* **Not All States Use DST**: Almost all of the US states have yearly clock changes. The only exceptions are Hawaii and Arizona (Hawaii observes HST all year).

---

## 2. Tax-Free States
Nine states do not impose state income tax:
* **Alaska**
* **Florida**
* **Nevada**
* **New Hampshire**
* **South Dakota**
* **Tennessee**
* **Texas**
* **Washington**
* **Wyoming**

![Image](/media/image4.jpeg)

---

## 3. Tri-State Area & Tripoints
* **Tri-State Area**: A term used informally to refer to a specific town or city that cuts across three different states at the same time, specifically on the eastern side. It includes the adjacent suburbs and regions.
* **Conditions**:
  1. The area has to have parts in three different states (e.g. a state boundary tripoint).
  2. The people living across this area need to have a connected economy and shared geography (climate, botanical nature, etc.).
* **Tripoints**: Locations where exactly 3 states meet. USA has **62 tripoints** (35 on dry land, 27 in water).

---

## 4. US Visa Regulations
A **Visa** is a legal document that allows any foreign national to stay, study, and visit in any foreign country for a temporary period.

In the US, there are two categories of visas:
1. **Immigrant Visas**
2. **Non-Immigrant Visas**

---

### Non-Immigrant Visas (Temporary Stay)

#### A. F1 Student Visa (5 Years Validity)
* **CPT (Curricular Practical Training)**: Off-campus work authorization during studies.
* **OPT (Optional Practical Training)**: Valid for **12 months** post-graduation.
* **STEM OPT Extension**: Valid for an additional **24 months** for Science, Technology, Engineering, and Mathematics graduates.

* **STEM**: Science, Technology, Engineering, Mathematics.

---

#### B. H1B Employer-Sponsored Work Visa
* **Validity**: **3 Years + 3 Years** (total 6 years).
* **Requirements**:
  * Employer should be E-verified.
  * Sponsoring employer pays prevailing wage.
  * Employee must have a bachelor's or higher degree and work only for the sponsoring employer.

---

#### C. H4 Dependent Visa of H1B
* **Validity**: Same as H1B holder.
* **Eligibility**: Spouses and children under 21. If unmarried, H1B holders can sponsor parents only.
* **Employment**: Not authorized to work unless they obtain an EAD (valid for 2 years). The H4 holder is only eligible to get an EAD if the H1B holder has more than 2 years left in their visa validity.

---

#### D. L2S Dependent of L1
* **Validity**: Same as L1.
* **Employment**: Can work **without** an EAD.

#### E. Asylum Visa
* **Validity**: No particular validity.
* **Employment**: Eligible for work once they obtain an EAD.

---

### Immigrant Visas (Permanent Residence)
An **Immigrant Visa** is a kind of permanent residence. It allows a foreign national to work permanently in the US.

#### A. GC-EAD (Green Card Employment Authorization Document)
* **Validity**: Valid for **2+2 years**.
* **Rules**: Candidate can work for any employer. During these 2 years, you are under observation and surveillance by the government regarding your finances and relationships to verify you are not involved in any threat activities. Prior to expiration, an interview is conducted, and if passed, the candidate becomes eligible for a 10-year Green Card.

#### B. Green Card (GC / Lawful Permanent Resident - LPR)
* **Validity**: Valid for **10 years**.
* **Rules**: Filed using **Form I-485**. Cannot stay outside the U.S. for longer than 6 months at a time. Holds all rights of a U.S. citizen except voting. Eligible to apply for U.S. Citizenship (USC) after a minimum of 5 years on a Green Card.`;

    if (!existingDoc) {
      const newDoc = new MandatoryDoc({
        key: docKey,
        title: "Mandatory Study Material",
        content: docContent,
      });
      await newDoc.save();
      return { success: true, seeded: true };
    } else {
      // Keep it updated if the content is slightly modified
      existingDoc.content = docContent;
      existingDoc.updatedAt = new Date();
      await existingDoc.save();
    }
    return { success: true, seeded: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Seed mandatory doc error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getMandatoryDoc() {
  try {
    await connectToDatabase();
    const doc = await MandatoryDoc.findOne({ key: "mandatory-read" });
    if (!doc) {
      // Auto seed if not found
      await seedMandatoryDoc();
      const freshlySeeded = await MandatoryDoc.findOne({ key: "mandatory-read" });
      return { success: true, doc: freshlySeeded ? freshlySeeded.content : "" };
    }
    return { success: true, doc: doc.content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function getSopDoc() {
  try {
    const filePath = path.join(process.cwd(), "src", "old-static", "sop.md");
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "SOP document not found." };
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, doc: content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Get SOP doc error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getWhyDoc() {
  try {
    const filePath = path.join(process.cwd(), "src", "old-static", "Why.md");
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "Why document not found." };
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, doc: content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Get Why doc error:", error);
    return { success: false, error: errorMessage };
  }
}

