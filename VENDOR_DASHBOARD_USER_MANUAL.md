# TeranGO Vendor Web Dashboard — User Manual

**Access URL**: https://teran-go-admin.vercel.app/

---

## Getting Started

### Logging In
- Open your web browser and go to: **https://teran-go-admin.vercel.app/**
- Enter your **email** and **password** provided by TeranGO admin.
- Click **Login**. You will be directed to your vendor dashboard.

---

## Pages Overview

### 1. Dashboard (Home)
Your main control center showing a summary of your business performance.

**What you see:**
- **Today's Revenue** — earnings from today's orders
- **Today's Orders** — number of orders received today
- **Total Revenue** — all-time earnings
- **Total Orders** — lifetime order count
- **Pending Orders** — orders waiting for your action
- **Completed Orders** — successfully delivered orders
- **Active Businesses** — how many of your locations/businesses are currently active
- **Total Menu Items** — number of items in your menu
- **Average Order Value** — average amount customers spend per order
- **Top Selling Items** — your best-performing products/dishes with sales count and revenue
- **Recent Orders** — latest orders with customer name, status, and total amount
- **Daily Stats Chart** — visual graph showing orders and revenue trends over time

**How to refresh:** The dashboard loads fresh data automatically when you visit. You can also reload your browser page to see updated numbers.

---

### 2. Orders
Manage all incoming orders from customers.

**Tabs:**
- **Active** — orders currently in progress (Pending, Accepted, Preparing, Ready)
- **Completed** — orders already delivered or cancelled

**Each order shows:**
- Order ID and time placed
- Customer name, phone, and delivery address
- Order type: **Pickup** or **Delivery**
- Payment method and status (Paid/Unpaid)
- Items ordered with quantities and prices
- Total amount (subtotal + delivery fee + discount if any)
- Driver assigned (for delivery orders)
- Special instructions/notes from customer

**How to update order status:**

Orders move sequentially through these stages:

1. **PENDING** → You can:
   - **Accept** → confirms you received the order
   - **Cancel** → rejects the order (use if you cannot fulfill it)

2. **ACCEPTED** → You can:
   - **Mark Processing** → order is being processed
   - **Mark Preparing** → you are preparing the food/items
   - **Cancel** (only if payment not yet made)

3. **PROCESSING** → You can:
   - **Mark Preparing** → you started preparing the order
   - **Mark Ready** → skip directly to ready if already prepared

4. **PREPARING** → You can:
   - **Mark Ready** → order is packed and ready for pickup/delivery

5. **READY** →
   - **For PICKUP orders**: You can mark as **Delivered** when customer collects it
   - **For DELIVERY orders**: The driver will handle final delivery — you cannot mark as delivered (stops at Ready)

**Terminal statuses:**
- **DELIVERED** — order successfully completed
- **CANCELLED** — order was cancelled

**Note:** The system only shows you ONE next action button at a time to prevent errors. You cannot skip stages or go backwards.

**Real-time updates:** New orders appear automatically with a sound notification. The page refreshes when order statuses change.

**Search orders:** Use the search bar at the top to find orders by customer name or order ID.

---

### 3. Menu
Manage your restaurant menu items (dishes).

**What you can do:**

#### View Menu Items
- See all your dishes with name, description, price, discounted price (if any), availability status, and image
- Filter by subcategory or meal time
- Search by item name

#### Add a New Menu Item
1. Click **+ Add Menu Item**
2. Fill in the form:
   - **Name** (required) — dish name
   - **Description** — details about the dish
   - **Price** (required) — regular price in Dalasi (D)
   - **Discounted Price** — optional sale price
   - **Meal Time** — Breakfast, Lunch, Dinner, All Day, etc.
   - **Subcategory** — select from the dropdown (e.g., Rice Dishes, Grills, Soups)
   - **Preparation Time** — estimated minutes to prepare
   - **Available** — toggle ON to make it visible to customers, OFF to hide it
   - **Image** — click to upload a photo of the dish (images are automatically uploaded to Cloudinary)
3. Click **Add Item**

#### Edit a Menu Item
1. Click the **Edit** (pencil icon) button on any item card
2. Update any details
3. Click **Save Changes**

#### Delete a Menu Item
1. Click the **Delete** (trash icon) button
2. Confirm deletion

**Image Upload:** Supported formats are JPG, PNG. Max recommended size: 5 MB. Images are resized and optimized automatically.

**Availability Toggle:** Turn items ON/OFF quickly without deleting them. When OFF, customers cannot see or order that item.

---

### 4. Payouts
View your earnings and request payouts from TeranGO admin.

**Earnings Summary:**
- **Total Earnings** — all-time revenue from delivered orders
- **Today's Earnings** — revenue earned today
- **Pending (Unsettled)** — money you have earned but not yet paid out
- **Settled** — total amount already paid to you

**Settlement History:**
A table showing all past and current payout requests:
- Request date
- Amount requested
- Status: **Pending**, **Processing**, **Completed**, **Rejected**
- Admin notes (if any)

**How to request a payout:**
1. Check your **Pending (Unsettled)** balance at the top of the page.
2. Click **Request Payout**.
3. A confirmation dialog will show the amount you are requesting.
4. Click **Confirm** to send the request to TeranGO admin.
5. Wait for admin to process your payout via Wave or cash.

**Important:**
- You can only have **one pending payout request** at a time.
- If you already have a pending request, the button will be disabled until admin processes it.
- Contact TeranGO admin directly via phone or Slack if you need to follow up on a payout.

---

### 5. Profile
Edit your business details.

**What you can update:**
- **Business Name** — your restaurant/shop/pharmacy name
- **Description** — brief information about your business
- **Address** — physical location
- **Phone** — business contact number
- **Email** — business email address
- **Website** — optional website URL

**How to update:**
1. Edit the fields in the form
2. Click **Save Changes**
3. Your profile will be updated immediately

**Note:** Some information may require admin approval before appearing publicly to customers. Contact admin if you need to change business type or critical details.

---

### 6. Settings
Configure business operations and preferences.

**What you can configure:**

#### Business Hours
Set your open/close times for each day of the week:
- Toggle each day ON (open) or OFF (closed)
- Set opening time (e.g., 8:00 AM)
- Set closing time (e.g., 10:00 PM)
- Click **Save Hours** to apply changes

When you are closed, customers cannot place orders from your business.

#### Business Settings
- **Auto-Accept Orders** — automatically accept all incoming orders (not recommended unless you always have capacity)
- **Open for Business** — master ON/OFF switch. When OFF, customers see "Closed" and cannot order
- **Allow Cash Payment** — accept cash on delivery
- **Allow Online Payment** — accept Wave and other digital payments

#### Notifications (if available)
- **New Orders** — get notified when a new order comes in
- **Order Updates** — notifications when order statuses change
- **Payment Alerts** — alerts when payments are processed

**Upload Business Logo:**
- Click the camera icon to upload your business logo/image
- Supported formats: JPG, PNG
- Image is resized and optimized automatically via Cloudinary

**Delivery Settings:**
- **Minimum Order Amount** — set a minimum order value customers must reach
- **Estimated Prep Time** — default time (in minutes) you need to prepare orders

**How to save settings:**
1. Make your changes
2. Click **Save Settings** at the bottom of each section
3. Settings are applied immediately

---

### 7. Subscription Status
If your vendor account requires a subscription, you will see a subscription banner at the top of your dashboard or on the settings page showing:
- **Active** — subscription is valid, you can receive orders
- **Expired** — subscription needs renewal, orders may be paused
- **Days Remaining** — time left on your current subscription

Contact TeranGO admin to renew or upgrade your subscription.

---

## Tips & Best Practices

- **Check the Dashboard regularly** to monitor your sales performance and spot trends.
- **Enable real-time notifications** for new orders so you don't miss any.
- **Update menu availability daily** — turn OFF items you run out of to avoid disappointing customers.
- **Upload high-quality images** for all menu items — items with photos sell 3x better.
- **Respond quickly to new orders** — accept or reject within 5 minutes to keep customers happy.
- **Mark orders Ready promptly** when they are actually ready for pickup/delivery.
- **Request payouts regularly** — don't let pending earnings accumulate for too long.
- **Set accurate business hours** — customers trust schedules, so keep them updated.
- **Use order notes** to see special customer requests before you start preparing.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| I can't log in | Check your email/password. Contact admin to reset your password. |
| Orders are not appearing | Refresh the page. Check that your business is set to "Open for Business" in Settings. |
| Image upload fails | Check your internet connection. Ensure the image is under 5 MB. Try JPG format. |
| Cannot mark order as Delivered | Delivery orders stop at READY — the driver marks them delivered. Only PICKUP orders can be marked Delivered by vendors. |
| Payout button is disabled | You already have a pending payout request. Wait for admin to process it. |
| Notification sound not working | Check browser permissions — allow notifications for the site. |

---

## Contact Support

If you encounter issues or need help:
- **WhatsApp/Call**: [TeranGO Support Number]
- **Slack**: Reach out in the #vendor-support channel
- **Email**: support@terango.gm

---

**Remember:** The web dashboard is best used on a **computer or tablet** for full features. For on-the-go access, use the **TeranGO Vendor Mobile App** (see separate mobile app manual).
