package org.fao.geonet.repository;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.fail;

import java.lang.reflect.Method;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import javax.annotation.Nonnull;
import javax.sql.DataSource;

import org.springframework.context.ApplicationContext;

import com.google.common.base.Function;

public final class SpringDataTestSupport {

    private SpringDataTestSupport() {
    }
    /**
     * Update the database directly with sql.  Note that this will affect the database
     * directly and can cause problems with JPA so it is best to clean up after. general pattern:
     * 
     * <pre><code>
     * updateNatively(context, new Function<Statement, Void>() { ...});
     * try {
     *   ....
     * } finally {
     *   updateNatively(context, new Function<Statement, Void>() { <clean up> });
     * }
     * @param context
     * @param function
     * @throws SQLException
     */
    protected static void updateNatively(ApplicationContext context, Function<Statement, Void> function) throws SQLException {
        DataSource dataSource = context.getBean(DataSource.class);
        Connection conn = null;
        Statement stmt = null;
        try {
            conn = dataSource.getConnection();
            stmt = conn.createStatement();
            
            function.apply(stmt);
        } finally {
            if (stmt != null) {
                stmt.close();
            }
            if(conn != null) {
                conn.close();
            }
        }
    }

    /**
     * Compares all properties of expected to actual.
     * <ul>
     * <li>.equals is used for comparison.</li>
     * <li>Each element in an array is checked</li>
     * </ul>
     * 
     * @param expected
     * @param actual
     */
    protected static final <T> void assertSameContents(@Nonnull T expected, T actual, String... skipProperties) throws Exception {
        Set<String> skip = new HashSet<String>(Arrays.asList(skipProperties));
        assertNotNull(actual);
        assertEquals(expected.getClass(), actual.getClass());

        
        Set<Map.Entry<String, Object>> expectedProperties = getProperties(expected, skip).entrySet();
        Map<String, Object> actualProperties = getProperties(actual, skip);

        assertEquals(expectedProperties.size(), actualProperties.size());

        for (Map.Entry<String, Object> expectedProperty : expectedProperties) {
            if(skip.contains(expectedProperty.getKey())) {
                continue;
            }

            Object actualProperty = actualProperties.get(expectedProperty.getKey());
            if (actualProperty == null && expectedProperty.getValue() != null) {
                fail("Value for " + expectedProperty.getKey() + " was null be we expected it to be " + expectedProperty.getValue());
            } else if (actualProperty == null && expectedProperty.getValue() == null) {
                continue;
            } else if (actualProperty.getClass().isArray()) {
                assertArrayEquals(expectedProperty.getKey() + " does not match", (Object[]) expectedProperty.getValue(),
                        (Object[]) actualProperty);
            } else {
                assertEquals(expectedProperty.getKey() + " does not match", expectedProperty.getValue(), actualProperty);
            }
        }
    }

    public static <T> Map<String, Object> getProperties(T actual, Set<String> skip) throws Exception {
        Map<String,Object> props = new HashMap<String,Object>();
        Method[] methods = actual.getClass().getMethods();
        for (Method method : methods) {
            if (method.getName().matches("(get)|(is).+") && !skip.contains(method.getName())
                    && method.getParameterTypes().length == 0) {
                Object value = method.invoke(actual);
                props.put(method.getName(), value);
            }
        }
        return props;
    }
}
