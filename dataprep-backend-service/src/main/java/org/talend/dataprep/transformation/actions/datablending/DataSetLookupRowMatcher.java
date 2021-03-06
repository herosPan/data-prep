// ============================================================================
// Copyright (C) 2006-2018 Talend Inc. - www.talend.com
//
// This source code is available under agreement available at
// https://github.com/Talend/data-prep/blob/master/LICENSE
//
// You should have received a copy of the agreement
// along with this program; if not, write to Talend SA
// 9 rue Pages 92150 Suresnes, France
//
// ============================================================================

package org.talend.dataprep.transformation.actions.datablending;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.talend.dataprep.api.dataset.ColumnMetadata;
import org.talend.dataprep.api.dataset.DataSet;
import org.talend.dataprep.api.dataset.RowMetadata;
import org.talend.dataprep.api.dataset.row.DataSetRow;
import org.talend.dataprep.dataset.adapter.DatasetClient;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.EMPTY;
import static org.springframework.beans.factory.config.BeanDefinition.SCOPE_PROTOTYPE;
import static org.talend.dataprep.transformation.actions.datablending.Lookup.Parameters.LOOKUP_DS_ID;

@Component
@Scope(SCOPE_PROTOTYPE)
public class DataSetLookupRowMatcher implements DisposableBean, LookupRowMatcher {

    /** This class' logger. */
    private static final Logger LOGGER = LoggerFactory.getLogger(DataSetLookupRowMatcher.class);

    @Autowired
    private DatasetClient datasetClient;

    /** The dataset id to lookup. */
    private String datasetId;

    /** Lookup row iterator. */
    private Iterator<DataSetRow> lookupIterator;

    /** Default empty row for the parsed lookup dataset. */
    private DataSetRow emptyRow;

    /** Cache of dataset row. */
    private Map<String, DataSetRow> cache = new HashMap<>();

    private String joinOnColumn;

    private List<LookupSelectedColumnParameter> selectedColumns;

    private Stream<DataSetRow> records;

    DataSetLookupRowMatcher() {
    }

    /**
     * Default constructor.
     *
     * @param parameters parameters that contains the the dataset id to lookup.
     */
    public DataSetLookupRowMatcher(Map<String, String> parameters) {
        this.datasetId = parameters.get(LOOKUP_DS_ID.getKey());
        joinOnColumn = parameters.get(Lookup.Parameters.LOOKUP_JOIN_ON.getKey());
        selectedColumns = Lookup.getColsToAdd(parameters);
    }

    void setJoinOnColumn(String joinOnColumn) {
        this.joinOnColumn = joinOnColumn;
    }

    void setSelectedColumns(List<LookupSelectedColumnParameter> selectedColumns) {
        this.selectedColumns = selectedColumns;
    }

    void setLookupIterator(Iterator<DataSetRow> lookupIterator) {
        this.lookupIterator = lookupIterator;
    }

    /**
     * Open the connection to get the dataset content and init the row iterator.
     */
    @PostConstruct
    private void init() {
        LOGGER.debug("opening {}", datasetId);
        DataSet lookup = datasetClient.getDataSet(datasetId, true);
        records = lookup.getRecords();
        this.lookupIterator = records.iterator();
        this.emptyRow = getEmptyRow(lookup.getMetadata().getRowMetadata().getColumns());
    }

    /**
     * Gently close the input stream as well as the http client.
     */
    @Override
    public void destroy() {
        records.close();
        LOGGER.debug("connection to {} closed", datasetId);
    }

    /**
     * Return the matching row from the loaded dataset.
     *
     * @param joinOn the column id to join on.
     * @param joinValue the join value.
     * @return the matching row or an empty one based on the
     */
    @Override
    public DataSetRow getMatchingRow(String joinOn, String joinValue) {

        if (joinValue == null) {
            LOGGER.debug("join value is null, returning empty row");
            return emptyRow;
        }

        // first, let's look in the cache
        if (cache.containsKey(joinValue)) {
            return cache.get(joinValue);
        }

        // if the value is not cached, let's update the cache
        List<ColumnMetadata> filteredColumns = null;
        while (lookupIterator.hasNext()) {
            DataSetRow nextRow = lookupIterator.next();
            final String nextRowJoinValue = nextRow.get(joinOn);

            // update the cache no matter what so that the next joinValue may be already cached !
            if (filteredColumns == null) {
                final List<String> selectedColumnIds = selectedColumns
                        .stream() //
                        .map(LookupSelectedColumnParameter::getId) //
                        .collect(Collectors.toList());
                filteredColumns = nextRow
                        .getRowMetadata() //
                        .getColumns() //
                        .stream() //
                        .filter(c -> !joinOnColumn.equals(c.getId()) && selectedColumnIds.contains(c.getId())) //
                        .collect(Collectors.toList());
            }

            if (!cache.containsKey(nextRowJoinValue)) {
                cache.put(nextRowJoinValue, nextRow.filter(filteredColumns).clone());
                LOGGER.trace("row found and cached for {} -> {}", nextRowJoinValue, nextRow.values());
            }

            // if matching row is found, let's stop here
            if (StringUtils.equals(joinValue, nextRowJoinValue)) {
                return cache.get(nextRowJoinValue);
            }
        }

        // the join value was not found and the cache is fully updated, so let's cache an empty row and return it
        cache.put(joinValue, this.emptyRow);
        LOGGER.trace("no row found for {}, returning an empty row", joinValue);
        return this.emptyRow;
    }

    @Override
    public RowMetadata getRowMetadata() {
        return emptyRow.getRowMetadata();
    }

    /**
     * Return an empty default row based on the given dataset metadata.
     *
     * @param columns the dataset to get build the row from.
     * @return an empty default row based on the given dataset metadata.
     */
    private DataSetRow getEmptyRow(List<ColumnMetadata> columns) {
        RowMetadata rowMetadata = new RowMetadata(columns);
        DataSetRow defaultRow = new DataSetRow(rowMetadata);
        columns.forEach(column -> defaultRow.set(column.getId(), EMPTY));
        return defaultRow;
    }

    @Override
    public String toString() {
        return "LookupRowMatcher{datasetId='" + datasetId + '}';
    }
}
