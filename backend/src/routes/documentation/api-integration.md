# Perfect Smile Maker — API Integration Documentation

## 1. Philippine Public Holidays API

### API Provider
**Nager.Date Public Holidays API**

### Purpose
The Holidays API retrieves Philippine public holidays and provides the frontend with holiday dates and names. This information can be used to help prevent appointment scheduling on public holidays.

### Why This API Was Chosen
Nager.Date was selected because it provides public holiday information for different countries, including the Philippines. It does not require an API key for this endpoint and returns data in JSON format.

## 2. API Endpoint

**Method:** GET

**Local Endpoint:**
```http
GET /api/holidays/{year}
```

**Example Request:**
```http
GET http://localhost:3000/api/holidays/2026
```

**External API URL:**
```text
https://date.nager.at/api/v3/PublicHolidays/{year}/PH
```

The country code `PH` represents the Philippines.

## 3. Authentication

The endpoint requires authentication through a JWT Bearer Token.

In Postman:
1. Select the Authorization tab.
2. Set Auth Type to Bearer Token.
3. Enter a valid login token.
4. Send the GET request.

## 4. Sample Successful Response

**HTTP Status:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-01-01",
      "name": "New Year's Day"
    }
  ],
  "message": "Holidays loaded"
}
```

The actual response contains the available holidays for the requested year.

## 5. Caching

The backend uses an in-memory JavaScript Map to cache holiday data by year.

- The first request retrieves holiday data from Nager.Date.
- The retrieved data is stored in the cache.
- Repeated requests for the same year return the cached data instead of making another external API request.

**Cached Response Message:**
```json
{
  "success": true,
  "message": "Holidays loaded (cached)"
}
```

## 6. Error Handling

### Invalid Year

The API only accepts years from 2000 to 2100.

**Example Request:**
```http
GET /api/holidays/1800
```

**HTTP Status:** 400 Bad Request

```json
{
  "success": false,
  "data": [],
  "message": "Invalid year"
}
```

### External API Failure

If the external holiday service is unavailable, returns an unsuccessful HTTP status, or the request times out, the backend responds with:

**HTTP Status:** 502 Bad Gateway

```json
{
  "success": false,
  "data": [],
  "message": "Holiday service unavailable"
}
```

The error is also logged in the backend terminal.

## 7. Postman Testing Results

The following tests were performed using Postman:

| Test Case | Expected Result | Actual Result |
|---|---|---|
| Retrieve holidays for 2026 | 200 OK | Passed |
| Retrieve cached holidays | 200 OK | Passed |
| Invalid year (1800) | 400 Bad Request | Passed |
| External API failure | 502 Bad Gateway | Passed |

### Test Screenshots

Insert the following screenshots in this section:

1. `holidays-success.png` — Successful retrieval of Philippine holidays.
2. `holidays-cache.png` — Successful cached response.
3. `holidays-invalid-year.png` — Invalid year validation response.
4. `holidays-api-failure.png` — External API failure response (to be added after testing).

---

**Project:** Perfect Smile Maker  
**Module:** Backend — Holidays API  
**Local Server:** http://localhost:3000