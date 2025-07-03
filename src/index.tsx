/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- INTERFACES ---

interface PricingItem {
    name: string;
    unit: string;
    price: number;
}

interface AnalyzedItem {
    ten: string;
    so_luong: number;
    don_vi: string;
}

interface AnalysisResult {
    san_pham?: string;
    kich_thuoc?: string;
    vat_lieu?: AnalyzedItem[];
    phu_kien?: AnalyzedItem[];
    cong_doan?: AnalyzedItem[];
}

interface CostTotals {
    materials: number;
    accessories: number;
    labor: number;
}


// --- DATABASE CLASS ---

class PricingDatabase {
    private materials: PricingItem[];
    private accessories: PricingItem[];
    private labor: PricingItem[];
    
    private readonly MATERIALS_KEY = 'smartpricing_materials';
    private readonly ACCESSORIES_KEY = 'smartpricing_accessories';
    private readonly LABOR_KEY = 'smartpricing_labor';

    constructor() {
        this.materials = this.loadData(this.MATERIALS_KEY);
        this.accessories = this.loadData(this.ACCESSORIES_KEY);
        this.labor = this.loadData(this.LABOR_KEY);
    }

    private loadData(key: string): PricingItem[] {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Failed to load data for key ${key}:`, error);
            return [];
        }
    }

    private saveData(key: string, data: PricingItem[]): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to save data for key ${key}:`, error);
        }
    }
    
    getMaterials = (): PricingItem[] => this.materials;
    addMaterial(item: PricingItem): void {
        this.materials.push(item);
        this.saveData(this.MATERIALS_KEY, this.materials);
    }
    deleteMaterial(index: number): void {
        this.materials.splice(index, 1);
        this.saveData(this.MATERIALS_KEY, this.materials);
    }

    getAccessories = (): PricingItem[] => this.accessories;
    addAccessory(item: PricingItem): void {
        this.accessories.push(item);
        this.saveData(this.ACCESSORIES_KEY, this.accessories);
    }
    deleteAccessory(index: number): void {
        this.accessories.splice(index, 1);
        this.saveData(this.ACCESSORIES_KEY, this.accessories);
    }

    getLabor = (): PricingItem[] => this.labor;
    addLabor(item: PricingItem): void {
        this.labor.push(item);
        this.saveData(this.LABOR_KEY, this.labor);
    }
    deleteLabor(index: number): void {
        this.labor.splice(index, 1);
        this.saveData(this.LABOR_KEY, this.labor);
    }
}

// --- MAIN APP CLASS ---

class SmartPricingApp {
    private readonly ai: GoogleGenAI;
    private readonly db: PricingDatabase;
    private lastTotals: CostTotals = { materials: 0, accessories: 0, labor: 0 };

    // DOM Elements
    private readonly calculateBtn: HTMLButtonElement;
    private readonly btnTextEl: HTMLSpanElement;
    private readonly spinnerEl: HTMLSpanElement;

    // Structured Form Elements
    private readonly dimWidthEl: HTMLInputElement;
    private readonly dimHeightEl: HTMLInputElement;
    private readonly dimDepthEl: HTMLInputElement;
    private readonly cabinetTypeCheckboxes: NodeListOf<HTMLInputElement>;
    private readonly materialSelectionEl: HTMLSelectElement;
    private readonly accessorySelectionEl: HTMLSelectElement;
    private readonly productDescriptionEl: HTMLTextAreaElement; // Now for additional requirements

    // Result section elements
    private readonly resultContainerEl: HTMLElement;
    private readonly jsonOutputEl: HTMLElement;
    private readonly errorMessageEl: HTMLElement;
    private readonly loadingMessageEl: HTMLElement;

    // Quote output elements
    private readonly quoteOutputEl: HTMLElement;
    private readonly quoteProductNameEl: HTMLElement;
    private readonly quoteMaterialsBodyEl: HTMLTableSectionElement;
    private readonly quoteAccessoriesBodyEl: HTMLTableSectionElement;
    private readonly quoteLaborBodyEl: HTMLTableSectionElement;
    
    // Summary elements
    private readonly summaryMaterialsTotalEl: HTMLElement;
    private readonly summaryAccessoriesTotalEl: HTMLElement;
    private readonly summaryLaborTotalEl: HTMLElement;
    private readonly summaryProductionTotalEl: HTMLElement;

    // Settings panel elements
    private readonly toggleSettingsBtn: HTMLButtonElement;
    private readonly settingsPanel: HTMLElement;
    private readonly addMaterialForm: HTMLFormElement;
    private readonly addAccessoryForm: HTMLFormElement;
    private readonly addLaborForm: HTMLFormElement;
    private readonly materialsTableBody: HTMLTableSectionElement;
    private readonly accessoriesTableBody: HTMLTableSectionElement;
    private readonly laborTableBody: HTMLTableSectionElement;

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.db = new PricingDatabase();

        // --- Element Selections ---
        this.calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
        this.btnTextEl = this.calculateBtn.querySelector('.btn-text') as HTMLSpanElement;
        this.spinnerEl = this.calculateBtn.querySelector('.spinner') as HTMLSpanElement;
        
        // Structured Form
        this.dimWidthEl = document.getElementById('dim-width') as HTMLInputElement;
        this.dimHeightEl = document.getElementById('dim-height') as HTMLInputElement;
        this.dimDepthEl = document.getElementById('dim-depth') as HTMLInputElement;
        this.cabinetTypeCheckboxes = document.querySelectorAll('input[name="cabinet-type"]');
        this.materialSelectionEl = document.getElementById('material-selection') as HTMLSelectElement;
        this.accessorySelectionEl = document.getElementById('accessory-selection') as HTMLSelectElement;
        this.productDescriptionEl = document.getElementById('product-description') as HTMLTextAreaElement;

        this.resultContainerEl = document.getElementById('result-container') as HTMLElement;
        this.jsonOutputEl = document.getElementById('json-output') as HTMLElement;
        this.errorMessageEl = document.getElementById('error-message') as HTMLElement;
        this.loadingMessageEl = document.getElementById('loading-message') as HTMLElement;

        this.quoteOutputEl = document.getElementById('quote-output') as HTMLElement;
        this.quoteProductNameEl = document.getElementById('quote-product-name') as HTMLElement;
        this.quoteMaterialsBodyEl = document.getElementById('quote-materials-body') as HTMLTableSectionElement;
        this.quoteAccessoriesBodyEl = document.getElementById('quote-accessories-body') as HTMLTableSectionElement;
        this.quoteLaborBodyEl = document.getElementById('quote-labor-body') as HTMLTableSectionElement;

        this.summaryMaterialsTotalEl = document.getElementById('summary-materials-total') as HTMLElement;
        this.summaryAccessoriesTotalEl = document.getElementById('summary-accessories-total') as HTMLElement;
        this.summaryLaborTotalEl = document.getElementById('summary-labor-total') as HTMLElement;
        this.summaryProductionTotalEl = document.getElementById('summary-production-total') as HTMLElement;
        
        this.toggleSettingsBtn = document.getElementById('toggle-settings-btn') as HTMLButtonElement;
        this.settingsPanel = document.getElementById('settings-panel') as HTMLElement;
        this.addMaterialForm = document.getElementById('add-material-form') as HTMLFormElement;
        this.addAccessoryForm = document.getElementById('add-accessory-form') as HTMLFormElement;
        this.addLaborForm = document.getElementById('add-labor-form') as HTMLFormElement;
        this.materialsTableBody = document.getElementById('materials-table-body') as HTMLTableSectionElement;
        this.accessoriesTableBody = document.getElementById('accessories-table-body') as HTMLTableSectionElement;
        this.laborTableBody = document.getElementById('labor-table-body') as HTMLTableSectionElement;
        
        this.init();
    }

    private init(): void {
        this.calculateBtn.addEventListener('click', () => this.handleCalculation());
        this.initSettings();
        this.renderTables();
        this.renderSelectOptions();
    }
    
    // --- Settings Panel Logic ---
    private initSettings(): void {
        this.toggleSettingsBtn.addEventListener('click', () => {
            const isHidden = this.settingsPanel.style.display === 'none';
            this.settingsPanel.style.display = isHidden ? 'flex' : 'none';
            this.toggleSettingsBtn.innerHTML = isHidden ? '🔽 Ẩn Cài Đặt' : '⚙️ Quản Lý Vật Tư & Đơn Giá';
        });

        this.addMaterialForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPricingItem(
                document.getElementById('material-name') as HTMLInputElement,
                document.getElementById('material-unit') as HTMLInputElement,
                document.getElementById('material-price') as HTMLInputElement,
                'material'
            );
            this.addMaterialForm.reset();
        });

        this.addAccessoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPricingItem(
                document.getElementById('accessory-name') as HTMLInputElement,
                document.getElementById('accessory-unit') as HTMLInputElement,
                document.getElementById('accessory-price') as HTMLInputElement,
                'accessory'
            );
            this.addAccessoryForm.reset();
        });

        this.addLaborForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPricingItem(
                document.getElementById('labor-name') as HTMLInputElement,
                document.getElementById('labor-unit') as HTMLInputElement,
                document.getElementById('labor-price') as HTMLInputElement,
                'labor'
            );
            this.addLaborForm.reset();
        });
    }
    
    private addPricingItem(nameInput: HTMLInputElement, unitInput: HTMLInputElement, priceInput: HTMLInputElement, type: 'material' | 'accessory' | 'labor'): void {
        const newItem: PricingItem = {
            name: nameInput.value.trim(),
            unit: unitInput.value.trim(),
            price: parseFloat(priceInput.value) || 0
        };
        
        let typeName = '';
        switch(type) {
            case 'material': typeName = 'vật liệu'; break;
            case 'accessory': typeName = 'phụ kiện'; break;
            case 'labor': typeName = 'nhân công'; break;
        }

        if (newItem.name && newItem.unit && newItem.price > 0) {
            if (type === 'material') this.db.addMaterial(newItem);
            else if (type === 'accessory') this.db.addAccessory(newItem);
            else this.db.addLabor(newItem);
            this.renderTables();
            this.renderSelectOptions(); // Re-render selection list
        } else {
            alert(`Vui lòng điền đầy đủ và hợp lệ thông tin ${typeName}.`);
        }
    }

    private renderTables(): void {
        this.renderDbTable(this.db.getMaterials(), this.materialsTableBody, 'material');
        this.renderDbTable(this.db.getAccessories(), this.accessoriesTableBody, 'accessory');
        this.renderDbTable(this.db.getLabor(), this.laborTableBody, 'labor');
    }

    private renderDbTable(items: PricingItem[], tableBody: HTMLTableSectionElement, type: 'material' | 'accessory' | 'labor'): void {
        tableBody.innerHTML = '';
        let typeName = '';
        switch(type) {
            case 'material': typeName = 'vật liệu'; break;
            case 'accessory': typeName = 'phụ kiện'; break;
            case 'labor': typeName = 'công việc'; break;
        }

        if (items.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = `Chưa có ${typeName} nào.`;
            cell.style.textAlign = 'center';
            cell.style.fontStyle = 'italic';
            cell.style.color = '#6c757d';
        } else {
            items.forEach((item, index) => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${this.escapeHTML(item.name)}</td>
                    <td>${this.escapeHTML(item.unit)}</td>
                    <td>${item.price.toLocaleString('vi-VN')}</td>
                    <td><button class="btn-delete" data-index="${index}" data-type="${type}">Xóa</button></td>
                `;
            });
        }
        
        tableBody.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
                    const target = e.currentTarget as HTMLButtonElement;
                    const index = parseInt(target.dataset.index!, 10);
                    const itemType = target.dataset.type;

                    if (itemType === 'material') this.db.deleteMaterial(index);
                    else if (itemType === 'accessory') this.db.deleteAccessory(index);
                    else if (itemType === 'labor') this.db.deleteLabor(index);
                    
                    this.renderTables();
                    this.renderSelectOptions(); // Re-render selection list
                }
            });
        });
    }
    
    private renderSelectOptions(): void {
        const renderList = (selectEl: HTMLSelectElement, items: PricingItem[], type: string) => {
            selectEl.innerHTML = '';
            if (items.length === 0) {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = `Chưa có ${type} trong Cài đặt.`;
                selectEl.appendChild(option);
                return;
            }
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = this.escapeHTML(item.name);
                option.textContent = this.escapeHTML(item.name);
                selectEl.appendChild(option);
            });
        };

        renderList(this.materialSelectionEl, this.db.getMaterials(), 'vật liệu');
        renderList(this.accessorySelectionEl, this.db.getAccessories(), 'phụ kiện');
    }

    private escapeHTML = (str: string): string => {
        const p = document.createElement("p");
        p.textContent = str;
        return p.innerHTML;
    }

    // --- UI State Management ---
    private setLoading(isLoading: boolean): void {
        this.calculateBtn.disabled = isLoading;
        this.errorMessageEl.style.display = 'none';

        if (isLoading) {
            this.btnTextEl.textContent = 'Đang xử lý...';
            this.spinnerEl.style.display = 'inline-block';
            this.resultContainerEl.style.display = 'block';
            this.loadingMessageEl.style.display = 'block';
            this.quoteOutputEl.style.display = 'none';
        } else {
            this.btnTextEl.textContent = 'Phân Tích & Tính Giá Thành';
            this.spinnerEl.style.display = 'none';
            this.loadingMessageEl.style.display = 'none';
        }
    }

    private displayError(message: string): void {
        this.resultContainerEl.style.display = 'block';
        this.errorMessageEl.textContent = message;
        this.errorMessageEl.style.display = 'block';
        this.quoteOutputEl.style.display = 'none';
    }
    
    // --- Calculation and Rendering ---

    private buildPromptFromForm(): string {
        let parts: string[] = [];
        
        const cabinetTypes = Array.from(this.cabinetTypeCheckboxes)
                                .filter(cb => cb.checked)
                                .map(cb => cb.value);
        if (cabinetTypes.length > 0) {
            parts.push(`Làm một tủ bếp ${cabinetTypes.join(' và ')}.`);
        }

        const width = this.dimWidthEl.value;
        const height = this.dimHeightEl.value;
        const depth = this.dimDepthEl.value;
        if (width || height || depth) {
            parts.push(`Kích thước: ${width ? 'rộng ' + width + 'm' : ''} ${height ? 'cao ' + height + 'm' : ''} ${depth ? 'sâu ' + depth + 'm' : ''}.`.trim());
        }

        const getSelectedOptions = (selectEl: HTMLSelectElement): string[] => {
             return Array.from(selectEl.selectedOptions).map(option => option.value);
        }
        
        const selectedMaterials = getSelectedOptions(this.materialSelectionEl);
        if (selectedMaterials.length > 0) {
            parts.push(`Sử dụng các vật liệu chính: ${selectedMaterials.join(', ')}.`);
        }

        const selectedAccessories = getSelectedOptions(this.accessorySelectionEl);
        if (selectedAccessories.length > 0) {
            parts.push(`Lắp đặt các phụ kiện sau: ${selectedAccessories.join(', ')}.`);
        }
        
        const additionalReqs = this.productDescriptionEl.value.trim();
        if (additionalReqs) {
            parts.push(`Yêu cầu bổ sung: ${additionalReqs}.`);
        }

        return parts.join(' ');
    }
    
    private async handleCalculation(): Promise<void> {
        const description = this.buildPromptFromForm();
        if (!description) {
            this.displayError('Vui lòng chọn hoặc nhập ít nhất một thông tin về sản phẩm.');
            return;
        }

        this.setLoading(true);

        const materialNames = this.db.getMaterials().map(item => `"${item.name}"`).join(', ');
        const accessoryNames = this.db.getAccessories().map(item => `"${item.name}"`).join(', ');
        const laborNames = this.db.getLabor().map(item => `"${item.name}"`).join(', ');

        const systemInstruction = `
            Bạn là một chuyên gia bóc tách khối lượng và dự toán chi phí trong ngành sản xuất nội thất gỗ công nghiệp và bảng hiệu quảng cáo tại Việt Nam.
            Nhiệm vụ của bạn là phân tích mô tả sản phẩm của người dùng và trả về một cấu trúc JSON chi tiết.
            Cấu trúc JSON phải bao gồm các mục: "san_pham" (string), "vat_lieu" (mảng), "phu_kien" (mảng), và "cong_doan" (mảng).
            Trong mỗi đối tượng của các mảng trên, phải có: "ten" (string), "so_luong" (number), và "don_vi" (string).
            
            QUAN TRỌNG: Khi xác định thuộc tính "ten" cho các mục trong "vat_lieu", "phu_kien", và "cong_doan", bạn BẮT BUỘC PHẢI CHỌN MỘT TÊN CHÍNH XÁC từ danh sách được cung cấp dưới đây. Không được tự ý thay đổi, chuẩn hóa hay dịch tên gọi.
            - Danh sách tên Vật Liệu hợp lệ: [${materialNames.length > 0 ? materialNames : '"Không có vật liệu nào"'}]
            - Danh sách tên Phụ Kiện hợp lệ: [${accessoryNames.length > 0 ? accessoryNames : '"Không có phụ kiện nào"'}]
            - Danh sách tên Công Đoạn hợp lệ: [${laborNames.length > 0 ? laborNames : '"Không có công đoạn nào"'}]

            Cố gắng ước tính "so_luong" một cách hợp lý nhất từ mô tả. Mặc định các công đoạn nên có số lượng là 1 trừ khi có mô tả chi tiết hơn.
            Luôn luôn chỉ trả về duy nhất một đối tượng JSON hợp lệ, không thêm bất kỳ văn bản, giải thích, hay ký tự markdown \`\`\`json \`\`\` nào khác.
        `;

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: `Mô tả sản phẩm: "${description}"`,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                },
            });

            let jsonStr = (response?.text ?? '').trim();
            const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[1]) {
              jsonStr = match[1].trim();
            }

            const parsedJson: AnalysisResult = JSON.parse(jsonStr);
            this.renderQuote(parsedJson);
            this.jsonOutputEl.textContent = JSON.stringify(parsedJson, null, 2);

        } catch (error) {
            console.error("API call or processing failed:", error);
            this.displayError('Đã có lỗi xảy ra khi phân tích sản phẩm. Vui lòng kiểm tra lại mô tả hoặc thử lại sau. Chi tiết lỗi đã được ghi lại trong console.');
        } finally {
            this.setLoading(false);
        }
    }
    
    private findDbItem = (name: string, dbItems: PricingItem[]): PricingItem | null => {
        const normalizedName = name.trim().toLowerCase();
        return dbItems.find(item => item.name.trim().toLowerCase() === normalizedName) || null;
    }
    
    private formatCurrency = (value: number): string => `${Math.round(value).toLocaleString('vi-VN')} VND`;

    private renderQuote(analysis: AnalysisResult): void {
        this.quoteOutputEl.style.display = 'block';
        this.errorMessageEl.style.display = 'none';

        this.quoteProductNameEl.textContent = `Chi Tiết Giá Thành: ${analysis.san_pham || 'Sản phẩm theo mô tả'}`;
        
        const renderCostSection = (
            analyzedItems: AnalyzedItem[] | undefined, 
            dbItems: PricingItem[], 
            tbody: HTMLTableSectionElement
        ): number => {
            let total = 0;
            tbody.innerHTML = '';
            analyzedItems?.forEach(item => {
                const dbItem = this.findDbItem(item.ten, dbItems);
                const price = dbItem?.price || 0;
                const subtotal = (item.so_luong || 0) * price;
                total += subtotal;

                const row = tbody.insertRow();
                if (!dbItem) row.classList.add('item-not-found');

                row.innerHTML = `
                    <td>${this.escapeHTML(item.ten)}</td>
                    <td class="text-right">${(item.so_luong || 0).toLocaleString('vi-VN')}</td>
                    <td>${this.escapeHTML(item.don_vi)}</td>
                    <td class="price-cell text-right">${this.formatCurrency(price)}</td>
                    <td class="text-right"><strong>${this.formatCurrency(subtotal)}</strong></td>
                `;
            });
            return total;
        };

        this.lastTotals.materials = renderCostSection(analysis.vat_lieu, this.db.getMaterials(), this.quoteMaterialsBodyEl);
        this.lastTotals.accessories = renderCostSection(analysis.phu_kien, this.db.getAccessories(), this.quoteAccessoriesBodyEl);
        this.lastTotals.labor = renderCostSection(analysis.cong_doan, this.db.getLabor(), this.quoteLaborBodyEl);

        this.updateSummary();
    }

    private updateSummary(): void {
        const { materials, accessories, labor } = this.lastTotals;

        this.summaryMaterialsTotalEl.textContent = this.formatCurrency(materials);
        this.summaryAccessoriesTotalEl.textContent = this.formatCurrency(accessories);
        this.summaryLaborTotalEl.textContent = this.formatCurrency(labor);

        const productionTotal = materials + accessories + labor;
        this.summaryProductionTotalEl.textContent = this.formatCurrency(productionTotal);
    }
}

// Initialize the app after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new SmartPricingApp();
});