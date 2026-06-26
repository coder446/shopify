import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  FormLayout,
  Toast,
  Frame,
  Stack,
  Text,
  Badge,
  IndexTable,
  Pagination,
  Spinner,
  Banner,
  ButtonGroup,
  Icon
} from "@shopify/polaris";
import { api } from "../services/api.js";

export default function Announcement() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toastProps, setToastProps] = useState({ active: false, message: "", error: false });
  
  // Dashboard stats and status state
  const [stats, setStats] = useState({ total: 0, synced: 0, failed: 0, currentActive: "", averageLength: 0 });
  const [systemStatus, setSystemStatus] = useState({ mongodb: "Loading", shopify: "Loading", themeExtension: "Loading", appEmbed: "Loading" });

  // History Table state
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Validation
  const [errorText, setErrorText] = useState("");

  const toggleToastActive = useCallback(() => setToastProps((prev) => ({ ...prev, active: false })), []);

  const showToast = (message, isError = false) => {
    setToastProps({ active: true, message, error: isError });
  };

  const loadData = useCallback(async () => {
    try {
      const [historyData, statsData, statusData] = await Promise.all([
        api.getHistory(page, limit, searchQuery),
        api.getStats(),
        api.getStatus()
      ]);
      
      setHistory(historyData.data || []);
      setTotalPages(historyData.totalPages || 1);
      setTotalCount(historyData.totalCount || 0);
      
      setStats(statsData);
      setSystemStatus(statusData);

      if (page === 1 && !searchQuery) {
        setText(statsData.currentActive || "");
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      showToast("Failed to load dashboard data", true);
    } finally {
      setInitialLoading(false);
    }
  }, [page, limit, searchQuery]);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, page, loadData]);

  const handleTextChange = (val) => {
    setText(val);
    if (val.trim().length === 0) {
      setErrorText("Announcement text cannot be empty.");
    } else if (val.length > 150) {
      setErrorText("Must be 150 characters or less.");
    } else {
      setErrorText("");
    }
  };

  const handleSave = async (customText = null) => {
    const textToSave = customText !== null ? customText : text;

    if (!textToSave.trim() || textToSave.length > 150) {
      setErrorText("Invalid announcement text.");
      return;
    }

    setLoading(true);
    try {
      await api.saveAnnouncement(textToSave);
      showToast("Announcement saved successfully");
      if (customText !== null) {
        setText(customText);
      }
      // Refresh all data
      await loadData();
    } catch (err) {
      showToast(err.message || "Error saving announcement", true);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (itemText) => {
    handleSave(itemText);
  };

  const handleCopy = (itemText) => {
    navigator.clipboard.writeText(itemText);
    showToast("Copied to clipboard!");
  };

  const handleExportCSV = () => {
    const headers = "Text,Date,Synced\n";
    const rows = history.map(h => `"${h.text}",${new Date(h.createdAt).toLocaleString()},${h.syncedToShopify}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcement_history.csv';
    a.click();
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcement_history.json';
    a.click();
  };

  const toastMarkup = toastProps.active ? (
    <Toast content={toastProps.message} error={toastProps.error} onDismiss={toggleToastActive} />
  ) : null;

  if (initialLoading) {
    return (
      <Page title="Global Announcement">
        <Stack distribution="center" alignment="center">
          <Spinner size="large" />
        </Stack>
      </Page>
    );
  }

  const rowMarkup = history.map(({ _id, text: itemText, createdAt, syncedToShopify }, index) => (
    <IndexTable.Row id={_id} key={_id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {itemText}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{new Date(createdAt).toLocaleString()}</IndexTable.Cell>
      <IndexTable.Cell>
        {syncedToShopify ? <Badge status="success">Yes</Badge> : <Badge status="critical">Failed</Badge>}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button size="slim" onClick={() => handleCopy(itemText)}>Copy</Button>
          <Button size="slim" primary onClick={() => handleRestore(itemText)}>Restore</Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Frame>
      <Page 
        title="Global Announcement Dashboard" 
        primaryAction={{ content: 'Export JSON', onAction: handleExportJSON }}
        secondaryActions={[{ content: 'Export CSV', onAction: handleExportCSV }]}
      >
        <Layout>
          
          <Layout.Section>
            <Card sectioned title="Current Announcement">
              <FormLayout>
                <TextField
                  label="Announcement Text"
                  value={text}
                  onChange={handleTextChange}
                  autoComplete="off"
                  placeholder="e.g. Summer Sale 50% Off!"
                  error={errorText}
                  maxLength={150}
                  showCharacterCount
                />
                <Stack distribution="trailing">
                  <Button 
                    primary 
                    loading={loading} 
                    disabled={!!errorText || !text.trim()} 
                    onClick={() => handleSave()}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </Stack>
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section secondary>
            <Card sectioned title="System Status">
              <Stack vertical spacing="tight">
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">MongoDB</Text>
                  {systemStatus.mongodb === "Connected" ? <Badge status="success">Connected</Badge> : <Badge status="critical">Failed</Badge>}
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Shopify API</Text>
                  {systemStatus.shopify === "Connected" ? <Badge status="success">Connected</Badge> : <Badge status="critical">Failed</Badge>}
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Theme Ext</Text>
                  {systemStatus.themeExtension === "Active" ? <Badge status="success">Active</Badge> : <Badge status="critical">Failed</Badge>}
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">App Embed</Text>
                  {systemStatus.appEmbed === "Enabled" ? <Badge status="success">Enabled</Badge> : <Badge status="critical">Failed</Badge>}
                </Stack>
              </Stack>
            </Card>
          </Layout.Section>

          <Layout.Section secondary>
            <Card sectioned title="Dashboard Statistics">
              <Stack vertical spacing="tight">
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Total Announcements</Text>
                  <Text variant="bodyMd" fontWeight="bold">{stats.total}</Text>
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Synced Successfully</Text>
                  <Text variant="bodyMd" fontWeight="bold">{stats.synced}</Text>
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Failed Syncs</Text>
                  <Text variant="bodyMd" fontWeight="bold">{stats.failed}</Text>
                </Stack>
                <Stack distribution="equalSpacing">
                  <Text variant="bodyMd">Avg Length</Text>
                  <Text variant="bodyMd" fontWeight="bold">{stats.averageLength} chars</Text>
                </Stack>
              </Stack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="Announcement History">
              <div style={{ padding: '16px' }}>
                <TextField
                  label="Search History"
                  labelHidden
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search previous announcements..."
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                />
              </div>
              <IndexTable
                itemCount={history.length}
                headings={[
                  { title: 'Announcement' },
                  { title: 'Date & Time' },
                  { title: 'Shopify Sync' },
                  { title: 'Actions' },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                <Pagination
                  hasPrevious={page > 1}
                  onPrevious={() => setPage(page - 1)}
                  hasNext={page < totalPages}
                  onNext={() => setPage(page + 1)}
                  label={`${page} of ${totalPages || 1} (${totalCount} total)`}
                />
              </div>
            </Card>
          </Layout.Section>

        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
}
