🛠️ MYLG! App (Making You Look Good)

The MYLG! App is a collaborative project management platform designed for designers, builders, and clients to plan, present, and execute projects seamlessly. Built with React, TypeScript, AWS Amplify, and WebSockets, it combines structured project management tools with real-time communication and visually intuitive design.

✨ Features

Projects & Budgets

Structured project pages with timeline, budget, and floorplans

Auto-generated element IDs and budget line tracking (with payment terms, PO, and invoice support)

File upload/download (CSV, floorplans, user assets)

Messaging & Collaboration

Real-time WebSocket messaging with optimistic UI

Project threads and direct messages

Notifications with deduplication logic

Role-based access (Admin, CEO, CTO, Designers, Clients, Workers)

Interactive Tools

Calendar integration for task planning and time-blocking

Lexical-based rich text editor for project notes and proposals

Support for voice notes and (planned) voice recognition

Architecture

Frontend: React + TypeScript + custom Webpack/Vite setup

Backend: AWS Amplify, DynamoDB, API Gateway WebSocket, Lambda functions

Auth: AWS Cognito with role claims injected at token issuance

Storage: Amazon S3 for files and assets

🚀 Roadmap

Multi-user calendar sharing and task scheduling

AI-assisted design chat (exploring GPT-J via AWS Bedrock)

Improved rendering workflows for 2D/3D assets