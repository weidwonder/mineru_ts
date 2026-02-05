export type CompareResult = {
    similarity: number;
    lcsLength: number;
    leftLines: number;
    rightLines: number;
    diffs: Array<{
        line: number;
        left: string;
        right: string;
    }>;
};
export declare function compareMarkdownStrings(left: string, right: string): CompareResult;
//# sourceMappingURL=compare-md.d.ts.map