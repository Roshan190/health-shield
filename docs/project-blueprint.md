# Project Blueprint

# HealthShield (Working Name)

**Version:** 1.0

**Document Type:** Product Requirement Document + Technical Architecture + Roadmap

> **Build order lives in [`ROADMAP.md`](./ROADMAP.md) and status in [`PROGRESS.md`](./PROGRESS.md).**  
> This blueprint is the full ambition. It is **not** permission to implement every phase now.

---

# Vision

Build a secure personal healthcare and insurance operating system that allows individuals and families to manage their complete healthcare journey in one place.

Instead of opening multiple apps for insurance, medical records, fitness, emergency contacts, prescriptions, hospitals, and claims, users can access everything from one dashboard.

The product should become the default health companion throughout a person's life.

---

# Mission

Enable every family to:

* Never lose insurance information
* Never lose medical records
* Be prepared during emergencies
* Track overall health
* Make insurance actually useful
* Improve preventive healthcare

---

# Core Principles

1. Privacy First
2. User owns their data
3. Security over convenience
4. Preventive rather than reactive
5. Family-centric
6. Platform independent
7. AI should assist, not diagnose

---

# Target Audience

## Primary

Age: 25–45

People who

* Have health insurance
* Have spouse or children
* Use smartwatch
* Do annual health checkups
* Store reports digitally

---

## Secondary

Senior citizens

Parents

People with chronic diseases

Corporate employees

People managing parents' healthcare

---

# User Personas

## Persona 1

Young Professional

* Single
* Health Insurance
* Apple Watch
* Wants reminders

---

## Persona 2

Family Manager

Usually one family member who manages everyone's insurance.

Needs

* Parents
* Spouse
* Kids

inside one dashboard.

---

## Persona 3

Senior Citizen

Needs

* Medication reminders
* Emergency access
* Family visibility

---

# Phase 0 — Research (2 Weeks)

## Market Research

Study

* CoverSure
* Google Health Connect
* Apple Health
* Apple Health Records
* Practo
* Tata 1mg
* ABHA ecosystem
* DigiLocker
* Insurance company apps

Understand

* Missing features
* Pain points
* Reviews
* User complaints

Deliverables

* Feature comparison
* Competitive analysis
* User interviews (minimum 30)
* UX findings

---

# Phase 1 — Foundation MVP

Goal:

Become the best insurance + health document organizer.

---

## Authentication

Email

Google

Apple

Phone OTP

Biometric unlock

Family invite

---

## User Profile

Name

DOB

Gender

Blood Group

Height

Weight

Allergies

Emergency Contact

Organ Donor

Medical Conditions

Lifestyle

Smoking

Alcohol

Exercise

---

## Family Module

Add

Father

Mother

Spouse

Children

Dependents

Permissions

Viewer

Editor

Emergency Only

Doctor Access

---

## Insurance Module

Support

Health

Term

Life

Personal Accident

Critical Illness

Store

Policy Number

Insurer

Coverage

Premium

Renewal

Nominee

Waiting Period

Claim Number

Network Hospitals

Policy PDF

Renewal Reminder

---

## Policy Import

Upload PDF

OCR

AI Extraction

Email Parsing

Manual Entry

Future

Insurer APIs

---

## Dashboard

Cards

Upcoming Renewal

Coverage

Recent Reports

Health Score

Family Summary

Notifications

Upcoming Checkups

---

## Medical Records

Categories

Blood Tests

MRI

CT

Prescription

Discharge Summary

Vaccination

Dental

Eye

Upload

PDF

Image

Lab Reports

Tagging

Search

Timeline

---

## Hospital Finder

Nearest Hospitals

Cashless Hospitals

Map

Directions

Call Hospital

Emergency Button

---

## Notification Engine

Premium Due

Policy Expiry

Report Due

Medicine Reminder

Health Check Reminder

---

# Phase 2 — Health Tracking

Integrations

Apple Health

Google Health Connect

Fitbit

Garmin

Samsung Health

---

Collect

Heart Rate

Sleep

Steps

Calories

Exercise

Blood Pressure

Blood Sugar (manual)

Weight

ECG (supported devices)

SpO2

Temperature (supported devices)

---

Dashboard

Daily

Weekly

Monthly

Yearly Trends

---

Health Timeline

Reports

Workout

Weight

Medicine

Doctor Visits

Insurance Events

---

# Phase 3 — Emergency System

SOS Button

Manual Trigger

Shake Detection (optional)

Fall Detection (device dependent)

Emergency Flow

1. Detect
2. Confirm
3. Notify Family
4. Share Live Location
5. Show Insurance
6. Show Nearby Covered Hospitals

Emergency Card

Blood Group

Allergies

Insurance

Emergency Contact

Current Medication

Medical Conditions

---

# Phase 4 — AI Assistant

Uses LLM

Capabilities

Explain reports

Summarize medical history

Prepare doctor visit summaries

Explain insurance policies

Claim guidance

Medicine reminders

Lifestyle suggestions

Do NOT

Diagnose

Prescribe medicine

Replace doctors

---

# Phase 5 — Claims Assistant

Guided Claim Filing

Required Documents

Claim Checklist

Hospital Checklist

Claim Status

Document Sharing

Timeline

---

# Phase 6 — Doctor Portal

Temporary access

Patient consent

Doctor can view

History

Reports

Insurance

Timeline

Prescription Upload

Session Notes

---

# Phase 7 — Premium Subscription

Advanced Analytics

Unlimited Storage

Family Plans

AI Insights

Priority Support

Export Records

Travel Emergency Pack

---

# Phase 8 — Enterprise

Corporate Wellness

HR Dashboard

Insurance Management

Employee Health

Anonymous Analytics

---

# Technical Architecture

## Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* React Query / TanStack Query
* Zustand
* React Hook Form
* Zod
* Framer Motion
* PWA support

Reason:
Fast, scalable, SEO-friendly, and familiar ecosystem.

---

## Mobile

**Recommended:** React Native + Expo

Why:

* Single codebase
* iOS + Android
* HealthKit support
* Health Connect support
* Camera
* Push notifications
* Background tasks

Alternative:

Flutter (excellent performance, but React Native integrates more naturally with your proposed web stack).

---

## Backend

* NestJS
* TypeScript
* REST + GraphQL (hybrid where appropriate)
* Prisma ORM

Reason:

Enterprise-ready architecture with strong TypeScript support.

---

## Database

PostgreSQL

Tables

Users

Families

Policies

Insurance Providers

Hospitals

Medical Reports

Health Metrics

Notifications

Claims

Audit Logs

Emergency Contacts

Permissions

Appointments

Medication

Activity Logs

---

## Storage

Object Storage

Options

* AWS S3
* Cloudflare R2
* Google Cloud Storage

Store

Reports

Policies

Images

Scans

---

## Search

Meilisearch

or

Algolia

Search

Reports

Doctors

Hospitals

Policies

Medicines

---

## Authentication

Clerk

or

Firebase Auth

Future

Passkeys

Biometrics

---

## Push Notifications

Firebase Cloud Messaging

Apple Push Notification Service

---

## Maps

Google Maps

or

Mapbox

---

## OCR

Google Vision API

Azure Document Intelligence

AWS Textract

---

## AI

OpenAI

or

Anthropic

Future

Self-hosted open models for sensitive workloads.

---

## Background Jobs

BullMQ

Redis

Used for

Notifications

OCR

Email Parsing

Reminder Engine

Scheduled Reports

---

## Analytics

PostHog

or

Mixpanel

Avoid collecting unnecessary health data.

---

## Monitoring

Sentry

OpenTelemetry

Grafana

Prometheus

---

## Infrastructure

Docker

GitHub Actions

Terraform (later)

Kubernetes (only when required)

---

## Hosting

Frontend

Vercel

Backend

Railway / Fly.io (early)

AWS ECS or Kubernetes (scale)

---

# Security

Encryption

AES-256 at rest

TLS 1.3

JWT Rotation

Refresh Tokens

Role Based Access

Audit Logs

Rate Limiting

OWASP Top 10

Virus scanning for uploads

Field-level encryption for sensitive data

Secrets Manager

Automatic backup

Disaster recovery

---

# Privacy

User consent

Granular permissions

Delete account

Download all data

Doctor access expiry

Family permission controls

Emergency-only access

Comply with India's DPDP Act. Design with future support for international compliance if expansion is planned.

---

# Future Integrations

ABHA (Ayushman Bharat Health Account)

Health Information Exchange (where supported)

Insurance company APIs

Laboratories

Hospitals

Diagnostic centers

Pharmacies

Telemedicine

Ambulance providers

DigiLocker

Calendar

Voice assistants

Wearables

---

# Database Modules

Users

Families

Policies

Providers

Nominees

Hospitals

Reports

Medical History

Vaccinations

Allergies

Vitals

Health Metrics

Medication

Doctors

Appointments

Claims

Notifications

Emergency Events

Locations

Permissions

Audit Logs

Devices

AI Conversations

Subscriptions

Billing

Settings

Feature Flags

---

# Suggested Monorepo Structure

apps/

* web
* mobile
* admin
* backend

packages/

* ui
* types
* config
* auth
* analytics
* api-sdk
* database
* utils

services/

* notification
* ai
* ocr
* scheduler
* integrations

---

# Success Metrics

Monthly Active Users

Policies Added

Families Created

Reports Uploaded

Health Sync Rate

Reminder Engagement

Retention (Day 30 / Day 90)

Claims Assisted

Emergency Contacts Configured

Net Promoter Score

---

# MVP Success Criteria

Within 90 days of launch:

* User can create an account.
* Add family members.
* Import at least one insurance policy.
* View policy summary and renewal reminders.
* Upload and organize medical reports.
* Search reports and policies.
* Locate nearby network hospitals.
* Maintain an emergency card.
* Sync basic wearable data (where available).
* Receive scheduled reminders.

Only after validating user adoption should the product expand into AI-assisted insights, claims automation, and provider integrations.

---

# 12-Month Roadmap

## Quarter 1

Research, design, architecture, MVP foundation.

## Quarter 2

Insurance management, health records, family features, notifications.

## Quarter 3

Wearable integrations, emergency workflows, AI summaries, claims assistance.

## Quarter 4

Doctor portal, subscriptions, enterprise pilots, ecosystem integrations, security audits, scalability improvements.
