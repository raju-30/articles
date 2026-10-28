# Guide: Creating Tables, Columns, and Rows in Appwrite

This guide walks you through setting up your Appwrite Database for the Article Tracker application.

---

## 1. Appwrite Terminology vs. Traditional SQL

If you are coming from SQL or spreadsheet databases, here is how the terminology maps:

| SQL Concept | Appwrite Equivalent | Description |
| :--- | :--- | :--- |
| **Database** | **Database** | Container holding your tables/collections. |
| **Table** | **Collection** | A schema grouping a specific set of records. |
| **Column** | **Attribute** | Field definitions (name, type, size, required, default). |
| **Row** | **Document** | An individual record or entry inside a collection. |

---

## 2. Step-by-Step Setup in Appwrite Console

### Step 1: Create a Project
1. Log in to [Appwrite Cloud](https://cloud.appwrite.io) or your self-hosted Appwrite instance.
2. In the Appwrite dashboard, click **Create Project**.
3. Name it (for example: `Article Tracker`).
4. Note your **Project ID** from the project settings.

### Step 2: Add Web Platform (For CORS)
1. In your project overview, click the **Web** icon under "Add a platform".
2. **Name**: `Article Tracker Web`
3. **Hostname**: 
   - If running locally: `localhost` or `127.0.0.1`
   - If hosted: your domain (e.g. `yourname.github.io`)
4. Click **Next** and complete the wizard.

---

### Step 3: Create a Database
1. In the left navigation menu, click **Databases**.
2. Click the **+ Create Database** button.
3. Enter:
   - **Name**: `Article Database`
   - **Database ID**: You can leave it to auto-generate or enter `articles_db`.
4. Click **Create**.

---

### Step 4: Create a Table (Collection)
1. Open your newly created database.
2. Click **+ Create Collection**.
3. Enter:
   - **Name**: `Articles`
   - **Collection ID**: Leave it or enter `articles`.
4. Click **Create**.

---

### Step 5: Create Columns (Attributes)
Inside your **Articles** collection, click the **Attributes** tab. Add the following attributes one by one:

#### Attribute 1: `title`
- Click **Create Attribute** -> Select **String**.
- **Attribute Key**: `title`
- **Size**: `255`
- **Required**: `Yes`
- Click **Create**.

#### Attribute 2: `url`
- Click **Create Attribute** -> Select **URL** (or **String** with size `1000`).
- **Attribute Key**: `url`
- **Required**: `Yes`
- Click **Create**.

#### Attribute 3: `status`
- Click **Create Attribute** -> Select **Enum** (or **String** with size `20`).
  - If Enum:
    - **Elements**: `ongoing`, `completed`
    - **Default value**: `ongoing`
  - If String:
    - **Attribute Key**: `status`
    - **Size**: `20`
    - **Default value**: `ongoing`
- **Required**: `No` (or `Yes` with default value)
- Click **Create**.

#### Attribute 4: `completed_at`
- Click **Create Attribute** -> Select **Datetime** (or **String** with size `50`).
- **Attribute Key**: `completed_at`
- **Required**: `No`
- Click **Create**.

> [!NOTE]
> Appwrite automatically creates built-in columns for every document:
> - `$id`: Unique row ID
> - `$createdAt`: Date and time when the row was created
> - `$updatedAt`: Date and time when the row was last updated

---

### Step 6: Configure Permissions (Crucial Step!)
By default, Appwrite blocks public read and write access for security. You must enable permissions so your frontend can read and save articles:

1. In your **Articles** collection, click the **Settings** tab.
2. Scroll down to **Permissions**.
3. Click **+ Add Role**.
4. Select **Any** (allows anyone with the web app to read/write) or **Users** (if using login).
5. Check the boxes for:
   - [x] **Create**
   - [x] **Read**
   - [x] **Update**
   - [x] **Delete**
6. Click **Update** at the bottom to save permissions.

---

### Step 7: Creating Rows (Documents)

#### Method A: Manually in Appwrite Console
1. Inside your **Articles** collection, go to the **Documents** tab.
2. Click **+ Create Document**.
3. Fill in the fields:
   - `title`: `Clean Code Principles`
   - `url`: `https://example.com/clean-code`
   - `status`: `ongoing`
   - `completed_at`: (Leave blank if ongoing)
4. Click **Create**.

#### Method B: Automatically via .env / Web App
1. The app reads configurations directly from [.env](file:///w:/Personal/Links/.env):
   ```env
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_DATABASE_ID=6ab4f1e80015b9b49329
   APPWRITE_DATABASE_NAME=resource_db
   APPWRITE_TABLE_ID=6ae1986d003ba57e42b2
   APPWRITE_COLLECTION_ID=6ae1986d003ba57e42b2
   APPWRITE_TABLE_NAME=articles
   ```
2. Open the app in your browser.
3. Click **Appwrite Config** in the top right to verify or input your `Project ID` (if not already set in `.env`).
4. Click **Test Connection** -> **Save Settings**.
5. Use the "Add New Article" form to create rows directly.

---

## 3. Code Reference (JavaScript SDK)

Here is how the JavaScript code in `app.js` interacts with your Appwrite table:

### 1. Initialize Client
```javascript
import { Client, Databases, ID, Query } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('<PROJECT_ID>');

const databases = new Databases(client);
```

### 2. Insert a Row (Create Document)
```javascript
const newArticle = await databases.createDocument(
  '<DATABASE_ID>',
  '<COLLECTION_ID>',
  ID.unique(),
  {
    title: 'Mastering JavaScript Async',
    url: 'https://developer.mozilla.org',
    status: 'ongoing',
    completed_at: null
  }
);
```

### 3. Fetch Rows (List Documents)
```javascript
const response = await databases.listDocuments(
  '<DATABASE_ID>',
  '<COLLECTION_ID>',
  [
    Query.orderDesc('$createdAt'),
    Query.limit(50)
  ]
);
console.log(response.documents);
```

### 4. Update a Row (Mark as Completed with Date)
```javascript
await databases.updateDocument(
  '<DATABASE_ID>',
  '<COLLECTION_ID>',
  '<DOCUMENT_ID>',
  {
    status: 'completed',
    completed_at: new Date().toISOString()
  }
);
```

### 5. Delete a Row
```javascript
await databases.deleteDocument(
  '<DATABASE_ID>',
  '<COLLECTION_ID>',
  '<DOCUMENT_ID>'
);
```

---

## 4. Troubleshooting Checklist

| Issue | Solution |
| :--- | :--- |
| **401 Unauthorized** | Check collection **Permissions** in Appwrite Settings. Ensure `Any` or appropriate role has `create`, `read`, `update`, `delete`. |
| **CORS / Access-Control-Allow-Origin** | Go to your Appwrite Project Overview -> Add Platform -> Web -> Add `localhost` or your domain. |
| **Attribute validation failed** | Ensure attribute types match: URL format, string size limit, or enum allowed values. |
| **Network Error** | Verify your Appwrite Endpoint URL is reachable (e.g. `https://cloud.appwrite.io/v1`). |
