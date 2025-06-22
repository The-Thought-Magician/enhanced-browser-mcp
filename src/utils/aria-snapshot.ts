import { Context } from "@/context";
import { ToolResult } from "@/tools/tool";

// Intelligent snapshot modes based on usage context
type SnapshotMode = 'navigation' | 'interaction' | 'form' | 'full' | 'minimal';

interface SnapshotConfig {
  mode: SnapshotMode;
  maxTokens: number;
  priorityElements: string[];
  includeContent: boolean;
  includeLayout: boolean;
}

// Intelligent snapshot processing based on context and website type
function getSnapshotConfig(url: string, actionContext: string): SnapshotConfig {
  // Determine the optimal snapshot mode based on URL and context
  const isFormPage = actionContext.includes('form') || actionContext.includes('input') || actionContext.includes('type');
  const isNavigation = actionContext.includes('navigate') || actionContext.includes('click');
  
  if (isFormPage) {
    return {
      mode: 'form',
      maxTokens: 8000,
      priorityElements: ['textbox', 'button', 'combobox', 'checkbox', 'radio', 'heading'],
      includeContent: false,
      includeLayout: false
    };
  } else if (isNavigation) {
    return {
      mode: 'navigation',
      maxTokens: 12000,
      priorityElements: ['link', 'button', 'heading', 'navigation', 'menu'],
      includeContent: true,
      includeLayout: false
    };
  } else {
    return {
      mode: 'interaction',
      maxTokens: 15000,
      priorityElements: ['button', 'link', 'textbox', 'heading', 'list', 'article'],
      includeContent: true,
      includeLayout: true
    };
  }
}

// Semantic element analyzer - understands what elements are actually important
function analyzeElements(snapshot: string): {
  critical: string[];
  important: string[];
  optional: string[];
  stats: any;
} {
  const lines = snapshot.split('\n');
  const critical: string[] = [];
  const important: string[] = [];
  const optional: string[] = [];
  
  const stats = {
    buttons: 0,
    links: 0,
    inputs: 0,
    headings: 0,
    navigation: 0,
    forms: 0,
    menus: 0,
    content: 0
  };
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Critical elements (always include)
    if (trimmed.includes('button') && (trimmed.includes('submit') || trimmed.includes('send') || trimmed.includes('save') || trimmed.includes('login'))) {
      critical.push(line);
      stats.buttons++;
    }
    // Form inputs
    else if (trimmed.includes('textbox') || trimmed.includes('combobox') || trimmed.includes('checkbox')) {
      critical.push(line);
      stats.inputs++;
    }
    // Navigation elements
    else if (trimmed.includes('navigation') || trimmed.includes('menu')) {
      critical.push(line);
      stats.navigation++;
    }
    // Important elements (include if space allows)
    else if (trimmed.includes('heading') && !trimmed.includes('[level=5]') && !trimmed.includes('[level=6]')) {
      important.push(line);
      stats.headings++;
    }
    else if (trimmed.includes('link') && !trimmed.includes('javascript:') && !trimmed.includes('#')) {
      important.push(line);
      stats.links++;
    }
    else if (trimmed.includes('button')) {
      important.push(line);
      stats.buttons++;
    }
    // Optional elements (include only if plenty of space)
    else {
      optional.push(line);
      if (trimmed.includes('text:') || trimmed.includes('paragraph')) stats.content++;
    }
  });
  
  return { critical, important, optional, stats };
}

// Intelligent compression that preserves semantic meaning
function createIntelligentSnapshot(
  snapshot: string, 
  config: SnapshotConfig,
  url: string
): { compressed: string; compressionReport: string } {
  
  if (typeof snapshot !== 'string') {
    return { compressed: String(snapshot), compressionReport: 'No compression needed' };
  }
  
  const analysis = analyzeElements(snapshot);
  const lines = snapshot.split('\n');
  let result: string[] = [];
  let currentTokens = 0;
  
  // Always include document structure and basic navigation
  const docStart = lines.slice(0, Math.min(5, lines.length));
  result.push(...docStart);
  currentTokens += docStart.join('\n').length;
  
  // Add critical elements first
  for (const line of analysis.critical) {
    if (currentTokens + line.length < config.maxTokens * 0.6) {
      result.push(line);
      currentTokens += line.length;
    }
  }
  
  // Add important elements if space allows
  for (const line of analysis.important) {
    if (currentTokens + line.length < config.maxTokens * 0.85) {
      result.push(line);
      currentTokens += line.length;
    }
  }
  
  // Add optional elements if plenty of space
  if (config.includeContent) {
    for (const line of analysis.optional) {
      if (currentTokens + line.length < config.maxTokens * 0.95) {
        result.push(line);
        currentTokens += line.length;
      } else {
        break;
      }
    }
  }
  
  const compressionReport = `
Mode: ${config.mode} | Elements: ${analysis.stats.buttons}B ${analysis.stats.links}L ${analysis.stats.inputs}I ${analysis.stats.headings}H
Original: ${snapshot.length} chars | Compressed: ${result.join('\n').length} chars | Ratio: ${Math.round((result.join('\n').length / snapshot.length) * 100)}%`;
  
  return { 
    compressed: result.join('\n'), 
    compressionReport 
  };
}

// Multi-tier response system
function createTieredResponse(
  url: string,
  title: string,
  snapshot: string,
  status: string,
  config: SnapshotConfig
): ToolResult {
  
  const { compressed, compressionReport } = createIntelligentSnapshot(snapshot, config, url);
  
  // Create summary for very complex pages
  const needsSummary = typeof snapshot === 'string' && snapshot.length > 20000;
  
  let content = `${status ? `${status}\n` : ""}
- Page URL: ${url}
- Page Title: ${title}
- Snapshot Mode: ${config.mode.toUpperCase()}
${compressionReport}

## Interactive Elements Snapshot
\`\`\`yaml
${compressed}
\`\`\``;

  if (needsSummary) {
    const analysis = analyzeElements(snapshot);
    content += `

## Page Summary
- **Interactive Elements**: ${analysis.stats.buttons} buttons, ${analysis.stats.links} links, ${analysis.stats.inputs} form inputs
- **Structure**: ${analysis.stats.headings} headings, ${analysis.stats.navigation} navigation areas
- **Content**: ${analysis.stats.content} content blocks
- **Optimization**: Showing most relevant elements for ${config.mode} context

💡 *This page was intelligently compressed to show the most relevant elements for your current task.*`;
  }

  return {
    content: [
      {
        type: "text",
        text: content,
      },
    ],
  };
}

export async function captureAriaSnapshot(
  context: Context,
  status: string = "",
): Promise<ToolResult> {
  const url = await context.sendSocketMessage("getUrl", undefined);
  const title = await context.sendSocketMessage("getTitle", undefined);
  const snapshot = await context.sendSocketMessage("browser_snapshot", {});
  
  // Determine the context from the status message to optimize snapshot
  const actionContext = status.toLowerCase();
  const config = getSnapshotConfig(url || '', actionContext);
  
  return createTieredResponse(url, title, snapshot, status, config);
}
